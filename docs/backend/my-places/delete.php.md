# api/my-places/delete.php

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

Endpoint перемещает объект текущего пользователя в архив.

Фактически объект не удаляется из базы данных, а получает статус:

```text
expired
```

Эта логика используется как «мягкое удаление» / архивирование.

## Метод и URL

```http
POST /api/my-places/delete.php
```

## Авторизация

Требуется user session.

Endpoint вызывает:

```php
$userId = requireAuth();
```

Пользователь может архивировать только свои объекты.

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
| `place_id` | number | да | ID объекта текущего пользователя. |

## Success response

HTTP `200`

```json
{
  "success": true,
  "data": {
    "message": "Объект перемещён в архив",
    "place_id": 123,
    "title": "Название объекта",
    "status": "expired"
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `400` | `Некорректный JSON` | Тело запроса не является JSON-объектом. |
| `400` | `Не передан ID объекта` | `place_id` отсутствует или меньше/равен нулю. |
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `404` | `Объект не найден или нет доступа` | Объект не найден или не принадлежит текущему пользователю. |
| `422` | `Объект уже находится в архиве` | Объект уже имеет статус `expired`. |
| `500` | `Не удалось переместить объект в архив` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint используется для действия «Удалить», «Архивировать» или «Переместить в архив» в личном кабинете.
- Так как объект не удаляется физически, в интерфейсе лучше использовать формулировку «Переместить в архив».
- После успешного ответа нужно:
  - обновить список объектов;
  - или локально заменить `status` объекта на `expired`.
- Если объект уже в архиве, backend вернёт `422`.
- При `404` нужно показать сообщение, что объект не найден или нет доступа.
- При `401` отправить пользователя на login.

## Backend notes

- Используется таблица `places`.
- Endpoint ищет объект только по:
  - `id`;
  - `user_id`.
- Если объект найден и ещё не `expired`, backend обновляет:
  - `status = 'expired'`;
  - `moderated_at = NULL`;
  - `updated_at = NOW()`.
- Физического удаления записи из `places` нет.
- Связанные изображения и атрибуты не удаляются.

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
        errorResponse('Объект не найден или нет доступа', 404);
    }

    if ($place['status'] === 'expired') {
        errorResponse('Объект уже находится в архиве', 422);
    }

    $updateStmt = $pdo->prepare("
        UPDATE places
        SET
            status = 'expired',
            moderated_at = NULL,
            updated_at = NOW()
        WHERE id = :id
        AND user_id = :user_id
        LIMIT 1
    ");

    $updateStmt->execute([
        'id' => $placeId,
        'user_id' => $userId,
    ]);

    successResponse([
        'message' => 'Объект перемещён в архив',
        'place_id' => $placeId,
        'title' => $place['title'],
        'status' => 'expired',
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось переместить объект в архив', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Документ структурирован из `php-after-changes/api-my-places-updated.md`. |