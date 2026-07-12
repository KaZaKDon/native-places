# api/notifications/read.php

## Статус

| Поле | Значение |
|---|---|
| Backend на хосте | да |
| Код сверено с хостом | да |
| Источник | `docs/API_FULL_TEXT.md` |
| Подключено на фронте | уточнить |
| Нужны правки backend | нет |
| Нужны правки frontend | уточнить |

## Назначение

Endpoint отмечает одно уведомление текущего пользователя как прочитанное.

## Метод и URL

```http
POST /api/notifications/read.php
```

## Авторизация

Требуется user session.

Пользователь может отметить прочитанным только своё уведомление.

## Request

Тело запроса передаётся в формате JSON.

```json
{
  "notification_id": 1
}
```

## Request fields

| Поле | Тип | Обязательное | Описание |
|---|---|---:|---|
| `notification_id` | number | да | ID уведомления текущего пользователя. |

## Success response

HTTP `200`

```json
{
  "success": true,
  "data": {
    "message": "Уведомление отмечено как прочитанное",
    "notification_id": 1
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `400` | `Не передан ID уведомления` | `notification_id` отсутствует или меньше/равен нулю. |
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `404` | `Уведомление не найдено` | Уведомление не найдено или не принадлежит пользователю. |
| `500` | `Не удалось обновить уведомление` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Использовать при клике/открытии уведомления.
- После успеха локально поставить `is_read = 1`.
- После успеха уменьшить `unread_count` или перезагрузить список уведомлений.

## Backend notes

- Используется таблица `notifications`.
- Обновляются поля:
  - `is_read = 1`;
  - `read_at = NOW()`.
- Проверка принадлежности уведомления выполняется через:
  - `id`;
  - `user_id`.
- Если `rowCount() === 0`, возвращается `404`.

## PHP-код

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(
    file_get_contents('php://input'),
    true
);

$notificationId = (int) ($input['notification_id'] ?? 0);

if ($notificationId <= 0) {
    errorResponse('Не передан ID уведомления', 400);
}

try {

    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        UPDATE notifications
        SET
            is_read = 1,
            read_at = NOW()
        WHERE id = :notification_id
        AND user_id = :user_id
        LIMIT 1
    ");

    $stmt->execute([
        'notification_id' => $notificationId,
        'user_id' => $userId,
    ]);

    if ($stmt->rowCount() === 0) {
        errorResponse('Уведомление не найдено', 404);
    }

    successResponse([
        'message' => 'Уведомление отмечено как прочитанное',
        'notification_id' => $notificationId,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось обновить уведомление',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Документ структурирован из `docs/API_FULL_TEXT.md`. |