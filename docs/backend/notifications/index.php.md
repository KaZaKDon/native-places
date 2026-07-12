# api/notifications/index.php

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

Endpoint возвращает уведомления текущего авторизованного пользователя.

Также возвращает количество непрочитанных уведомлений.

## Метод и URL

```http
GET /api/notifications/index.php
```

## Авторизация

Требуется user session.

Endpoint вызывает:

```php
$userId = requireAuth();
```

## Request

Тело запроса не требуется.

Query-параметры не используются.

## Success response

HTTP `200`

```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": 1,
        "type": "moderation",
        "title": "Объявление опубликовано",
        "message": "Ваш объект прошёл модерацию",
        "is_read": 0,
        "read_at": null,
        "created_at": "2026-07-04 10:00:00"
      }
    ],
    "unread_count": 1
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `500` | `Не удалось получить уведомления` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint использовать для центра уведомлений.
- `unread_count` использовать для бейджа в шапке/меню.
- Уведомления уже отсортированы от новых к старым.
- Если `notifications` пустой, показать empty state.
- Для прочтения одного уведомления использовать `read.php`.
- Для прочтения всех уведомлений использовать `read-all.php`.

## Backend notes

- Используется таблица `notifications`.
- Выборка идёт только по текущему пользователю:
  - `user_id = :user_id`.
- Непрочитанные считаются по:
  - `is_read = 0`.
- Сортировка:
  - `created_at DESC`;
  - `id DESC`.

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
        SELECT
            id,
            type,
            title,
            message,
            is_read,
            read_at,
            created_at
        FROM notifications
        WHERE user_id = :user_id
        ORDER BY created_at DESC, id DESC
    ");

    $stmt->execute([
        'user_id' => $userId,
    ]);

    $notifications = $stmt->fetchAll();

    $unreadStmt = $pdo->prepare("
        SELECT COUNT(*) AS total
        FROM notifications
        WHERE user_id = :user_id
        AND is_read = 0
    ");

    $unreadStmt->execute([
        'user_id' => $userId,
    ]);

    $unreadCount = (int) $unreadStmt->fetch()['total'];

    successResponse([
        'notifications' => $notifications,
        'unread_count' => $unreadCount,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось получить уведомления',
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