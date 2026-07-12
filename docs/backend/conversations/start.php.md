# api/conversations/start.php

## Статус

| Поле | Значение |
|---|---|
| Backend на хосте | да |
| Код сверено с хостом | да |
| Источник | `php-after-changes/api-conversations-messages-updated.md` |
| Подключено на фронте | уточнить |
| Нужны правки backend | нет |
| Нужны правки frontend | уточнить |

## Назначение

Endpoint создаёт новый диалог по объявлению или возвращает уже существующий диалог.

Диалог нельзя создать:

- по своему объявлению;
- по неопубликованному объявлению;
- по объявлению с истёкшим сроком публикации;
- по объявлению, которое ожидает оплату.

## Метод и URL

```http
POST /api/conversations/start.php
```

## Авторизация

Требуется user session.

Endpoint вызывает:

```php
$userId = requireAuth();
```

## Request

Тело запроса передаётся в формате JSON.

```json
{
  "place_id": 123
}
```

## Request fields

| Поле | Тип | Обязательное | Правила |
|---|---|---:|---|
| `place_id` | number | да | ID объявления, по которому нужно открыть диалог. |

## Success response

### Вариант 1 — диалог уже существует

HTTP `200`

```json
{
  "success": true,
  "data": {
    "message": "Диалог уже существует",
    "conversation_id": 1,
    "created": false,
    "place": {
      "id": 123,
      "user_id": 10,
      "title": "Название объявления",
      "slug": "place-slug",
      "status": "published",
      "expires_at": null,
      "payment_status": "paid"
    }
  }
}
```

### Вариант 2 — создан новый диалог

HTTP `201`

```json
{
  "success": true,
  "data": {
    "message": "Диалог создан",
    "conversation_id": 2,
    "created": true,
    "place": {
      "id": 123,
      "user_id": 10,
      "title": "Название объявления",
      "slug": "place-slug",
      "status": "published",
      "expires_at": null,
      "payment_status": "paid"
    }
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `400` | `Некорректный JSON` | Тело запроса не является JSON-объектом. |
| `400` | `Не передан ID объекта` | `place_id` отсутствует или меньше/равен нулю. |
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `404` | `Объект не найден` | Объявление с таким `place_id` не найдено. |
| `422` | `Нельзя открыть диалог со своим объявлением` | Пользователь пытается написать по своему объявлению. |
| `422` | `По этому объявлению нельзя написать сообщение` | Объявление не опубликовано. |
| `422` | `Срок публикации объявления истёк` | `expires_at` меньше текущего времени. |
| `422` | `Объявление ожидает оплату` | `payment_status` не `not_required` и не `paid`. |
| `500` | `Не удалось создать диалог` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint используется при нажатии кнопки «Написать» на странице объявления.
- Если `created = false`, нужно открыть уже существующий диалог.
- Если `created = true`, нужно открыть новый диалог.
- После успеха frontend должен перейти на страницу/экран диалога по `conversation_id`.
- При `422` нужно показать причину пользователю.
- Если пользователь не авторизован, перед созданием диалога нужно предложить login.

## Backend notes

- Используются таблицы:
  - `places`;
  - `conversations`.
- Владелец объявления берётся из `places.user_id`.
- Уникальность диалога фактически проверяется по:
  - `place_id`;
  - `owner_id`;
  - `user_id`.
- При создании нового диалога `last_message_at` ставится в `NOW()`, даже если сообщений ещё нет.
- Endpoint не создаёт первое сообщение, он только создаёт диалог.

## PHP-код

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    errorResponse('Некорректный JSON', 400);
}

$placeId = (int) ($input['place_id'] ?? 0);

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

try {
    $pdo = getDatabaseConnection();

    $placeStmt = $pdo->prepare("
        SELECT
            id,
            user_id,
            title,
            slug,
            status,
            expires_at,
            payment_status
        FROM places
        WHERE id = :place_id
        LIMIT 1
    ");

    $placeStmt->execute([
        'place_id' => $placeId,
    ]);

    $place = $placeStmt->fetch();

    if (!$place) {
        errorResponse('Объект не найден', 404);
    }

    if ((int) $place['user_id'] === $userId) {
        errorResponse('Нельзя открыть диалог со своим объявлением', 422);
    }

    if ($place['status'] !== 'published') {
        errorResponse('По этому объявлению нельзя написать сообщение', 422);
    }

    if ($place['expires_at'] !== null && strtotime($place['expires_at']) < time()) {
        errorResponse('Срок публикации объявления истёк', 422);
    }

    if ($place['payment_status'] !== null && !in_array($place['payment_status'], ['not_required', 'paid'], true)) {
        errorResponse('Объявление ожидает оплату', 422);
    }

    $conversationStmt = $pdo->prepare("
        SELECT id
        FROM conversations
        WHERE place_id = :place_id
        AND owner_id = :owner_id
        AND user_id = :user_id
        LIMIT 1
    ");

    $conversationStmt->execute([
        'place_id' => $placeId,
        'owner_id' => (int) $place['user_id'],
        'user_id' => $userId,
    ]);

    $conversation = $conversationStmt->fetch();

    if ($conversation) {
        successResponse([
            'message' => 'Диалог уже существует',
            'conversation_id' => (int) $conversation['id'],
            'created' => false,
            'place' => $place,
        ]);
    }

    $insertStmt = $pdo->prepare("
        INSERT INTO conversations (
            place_id,
            owner_id,
            user_id,
            last_message_at,
            created_at,
            updated_at
        ) VALUES (
            :place_id,
            :owner_id,
            :user_id,
            NOW(),
            NOW(),
            NOW()
        )
    ");

    $insertStmt->execute([
        'place_id' => $placeId,
        'owner_id' => (int) $place['user_id'],
        'user_id' => $userId,
    ]);

    successResponse([
        'message' => 'Диалог создан',
        'conversation_id' => (int) $pdo->lastInsertId(),
        'created' => true,
        'place' => $place,
    ], 201);
} catch (Throwable $e) {
    errorResponse('Не удалось создать диалог', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Документ структурирован из `php-after-changes/api-conversations-messages-updated.md`. |