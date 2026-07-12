# api/notifications/read-all.php

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

Endpoint отмечает все непрочитанные уведомления текущего пользователя как прочитанные.

## Метод и URL

```http
POST /api/notifications/read-all.php
```

## Авторизация

Требуется user session.

## Request

Тело запроса не требуется.

## Success response

HTTP `200`

```json
{
  "success": true,
  "data": {
    "message": "Все уведомления отмечены как прочитанные",
    "updated": 5
  }
}
```

## Response fields

| Поле | Тип | Описание |
|---|---|---|
| `message` | string | Сообщение об успехе. |
| `updated` | number | Сколько строк было обновлено. |

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `500` | `Не удалось обновить уведомления` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Использовать для кнопки «Прочитать все».
- После успеха локально установить всем уведомлениям `is_read = 1`.
- После успеха установить `unread_count = 0`.
- `updated` можно использовать для toast-сообщения или отладки.

## Backend notes

- Используется таблица `notifications`.
- Обновляются только непрочитанные уведомления текущего пользователя:
  - `user_id = :user_id`;
  - `is_read = 0`.
- Обновляются поля:
  - `is_read = 1`;
  - `read_at = NOW()`.

## PHP-код

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

try {

    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        UPDATE notifications
        SET
            is_read = 1,
            read_at = NOW()
        WHERE user_id = :user_id
        AND is_read = 0
    ");

    $stmt->execute([
        'user_id' => $userId,
    ]);

    successResponse([
        'message' => 'Все уведомления отмечены как прочитанные',
        'updated' => $stmt->rowCount(),
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось обновить уведомления',
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