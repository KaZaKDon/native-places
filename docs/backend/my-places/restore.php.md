# api/my-places/restore.php

## Статус

| Поле | Значение |
|---|---|
| Backend на хосте | да |
| Код сверено с хостом | да |
| Источник | `php-after-changes/api-my-places-updated.md` |
| Подключено на фронте | уточнить |
| Нужны правки backend | нет |
| Нужны правки frontend | уточнить |

## Назначение

Endpoint восстанавливает объявление из архива.

Восстановить можно только объект со статусом:

```text
expired
```

После восстановления объект получает статус:

```text
pending
```

То есть объявление возвращается на модерацию.

## Метод и URL

```http
POST /api/my-places/restore.php
```

## Авторизация

Требуется user session.

Endpoint вызывает:

```php
$userId = requireAuth();
```

Пользователь может восстановить только своё объявление.

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
| `place_id` | number | да | ID архивного объявления текущего пользователя. |

## Success response

HTTP `200`

```json
{
  "success": true,
  "data": {
    "message": "Объявление восстановлено и отправлено на модерацию",
    "place_id": 123,
    "title": "Название объявления",
    "status": "pending"
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `400` | `Некорректный JSON` | Тело запроса не является JSON-объектом. |
| `400` | `Не передан ID объекта` | `place_id` отсутствует или меньше/равен нулю. |
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `404` | `Объявление не найдено или нет доступа` | Объявление не найдено или не принадлежит текущему пользователю. |
| `422` | `Восстановить можно только объявление из архива` | Статус объявления не `expired`. |
| `422` | `Нет активного тарифа для восстановления объявления` | У пользователя нет активного тарифа. |
| `422` | `Превышен лимит объявлений по текущему тарифу` | Восстановление превысит лимит активных объявлений по тарифу. |
| `500` | `Не удалось восстановить объявление` | Неожиданная ошибка backend-а или базы данных. |

## Validation details

Если превышен лимит тарифа, backend возвращает дополнительные данные:

```json
{
  "success": false,
  "message": "Превышен лимит объявлений по текущему тарифу",
  "extra": {
    "errors": {
      "place_id": "Выберите тариф с большим лимитом или оставьте объявление в архиве"
    },
    "limit": 5,
    "used": 5
  }
}
```

## Frontend notes

- Endpoint используется для кнопки «Восстановить» в архиве объявлений.
- После успешного восстановления объект нужно перевести в статус `pending` в UI.
- Пользователю стоит показать сообщение, что объявление отправлено на модерацию.
- Если превышен лимит, нужно предложить сменить тариф или оставить объявление в архиве.
- Если нет активного тарифа, нужно предложить выбрать тариф.
- При `401` отправить пользователя на login.

## Backend notes

- Используются таблицы:
  - `places`;
  - `user_subscriptions`;
  - `plans`.
- Восстановление доступно только для `places.status = 'expired'`.
- Проверяется активная подписка пользователя:
  - `user_subscriptions.status = 'active'`.
- Если `plans.max_places > 0`, backend считает активные объявления пользователя со статусами:
  - `pending`;
  - `published`;
  - `rejected`.
- Если активных объявлений уже столько же или больше лимита, восстановление запрещается.
- При восстановлении обновляются:
  - `status = 'pending'`;
  - `moderated_at = NULL`;
  - `updated_at = NOW()`.

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
            title,
            status
        FROM places
        WHERE id = :id
        AND user_id = :user_id
        LIMIT 1
    ");

    $placeStmt->execute([
        'id' => $placeId,
        'user_id' => $userId,
    ]);

    $place = $placeStmt->fetch();

    if (!$place) {
        errorResponse('Объявление не найдено или нет доступа', 404);
    }

    if ($place['status'] !== 'expired') {
        errorResponse('Восстановить можно только объявление из архива', 422);
    }

    $subscriptionStmt = $pdo->prepare("
        SELECT
            us.id,
            p.max_places
        FROM user_subscriptions us
        INNER JOIN plans p
            ON p.id = us.plan_id
        WHERE us.user_id = :user_id
        AND us.status = 'active'
        ORDER BY us.starts_at DESC, us.id DESC
        LIMIT 1
    ");

    $subscriptionStmt->execute([
        'user_id' => $userId,
    ]);

    $subscription = $subscriptionStmt->fetch();

    if (!$subscription) {
        errorResponse('Нет активного тарифа для восстановления объявления', 422);
    }

    $maxPlaces = (int) ($subscription['max_places'] ?? 0);

    if ($maxPlaces > 0) {
        $activePlacesStmt = $pdo->prepare("
            SELECT COUNT(*)
            FROM places
            WHERE user_id = :user_id
            AND status IN ('pending', 'published', 'rejected')
        ");

        $activePlacesStmt->execute([
            'user_id' => $userId,
        ]);

        $activePlacesCount = (int) $activePlacesStmt->fetchColumn();

        if ($activePlacesCount >= $maxPlaces) {
            errorResponse('Превышен лимит объявлений по текущему тарифу', 422, [
                'errors' => [
                    'place_id' => 'Выберите тариф с большим лимитом или оставьте объявление в архиве',
                ],
                'limit' => $maxPlaces,
                'used' => $activePlacesCount,
            ]);
        }
    }

    $updateStmt = $pdo->prepare("
        UPDATE places
        SET
            status = 'pending',
            moderated_at = NULL,
            updated_at = NOW()
        WHERE id = :id
        AND user_id = :user_id
        AND status = 'expired'
        LIMIT 1
    ");

    $updateStmt->execute([
        'id' => $placeId,
        'user_id' => $userId,
    ]);

    successResponse([
        'message' => 'Объявление восстановлено и отправлено на модерацию',
        'place_id' => $placeId,
        'title' => $place['title'],
        'status' => 'pending',
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось восстановить объявление', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Документ структурирован из `php-after-changes/api-my-places-updated.md`. |