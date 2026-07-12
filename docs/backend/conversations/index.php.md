# api/conversations/index.php

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

Endpoint возвращает список диалогов текущего авторизованного пользователя.

Диалоги включают:

- данные объявления;
- владельца объявления;
- количество сообщений;
- количество непрочитанных входящих сообщений;
- текст последнего сообщения;
- отправителя последнего сообщения.

Диалоги сортируются по последнему сообщению.

## Метод и URL

```http
GET /api/conversations/index.php
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
    "conversations": [
      {
        "id": 1,
        "place_id": 123,
        "owner_id": 10,
        "user_id": 20,
        "last_message_at": "2026-07-04 10:00:00",
        "created_at": "2026-07-04 09:00:00",
        "place_title": "Название объявления",
        "place_slug": "place-slug",
        "cover_image": "/path/to/image.jpg",
        "place_status": "published",
        "owner_name": "Иван",
        "message_count": 5,
        "unread_count": 2,
        "last_message_text": "Последнее сообщение",
        "last_sender_id": 20,
        "last_sender_name": "Пётр"
      }
    ]
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `500` | `Не удалось получить список диалогов` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint используется для страницы/виджета списка диалогов.
- Один и тот же список подходит и владельцу объявления, и пользователю, который написал по объявлению.
- Для бейджа непрочитанных сообщений использовать `unread_count`.
- Для превью карточки диалога использовать `last_message_text`.
- Для сортировки на фронте обычно дополнительная сортировка не нужна: backend уже сортирует по `last_message_at DESC`.
- Если `conversations` пустой, показать empty state.
- При `401` отправить пользователя на login.

## Backend notes

- Используются таблицы:
  - `conversations`;
  - `places`;
  - `users`;
  - `messages`.
- Пользователь видит диалог, если он:
  - владелец объявления: `c.owner_id = userId`;
  - участник диалога: `c.user_id = userId`.
- `message_count` считается подзапросом по таблице `messages`.
- `unread_count` считает только входящие сообщения:
  - `sender_id != current_user_id`;
  - `is_read = 0`.
- Последнее сообщение определяется по:
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
            c.id,
            c.place_id,
            c.owner_id,
            c.user_id,
            c.last_message_at,
            c.created_at,

            p.title AS place_title,
            p.slug AS place_slug,
            p.cover_image,
            p.status AS place_status,

            owner.first_name AS owner_name,

            (
                SELECT COUNT(*)
                FROM messages m
                WHERE m.conversation_id = c.id
            ) AS message_count,

            (
                SELECT COUNT(*)
                FROM messages unread_messages
                WHERE unread_messages.conversation_id = c.id
                AND unread_messages.sender_id != :current_user_id
                AND unread_messages.is_read = 0
            ) AS unread_count,

            (
                SELECT lm.message_text
                FROM messages lm
                WHERE lm.conversation_id = c.id
                ORDER BY lm.created_at DESC, lm.id DESC
                LIMIT 1
            ) AS last_message_text,

            (
                SELECT lm.sender_id
                FROM messages lm
                WHERE lm.conversation_id = c.id
                ORDER BY lm.created_at DESC, lm.id DESC
                LIMIT 1
            ) AS last_sender_id,

            (
                SELECT last_sender.first_name
                FROM messages lm
                INNER JOIN users last_sender
                    ON last_sender.id = lm.sender_id
                WHERE lm.conversation_id = c.id
                ORDER BY lm.created_at DESC, lm.id DESC
                LIMIT 1
            ) AS last_sender_name

        FROM conversations c

        INNER JOIN places p
            ON p.id = c.place_id

        INNER JOIN users owner
            ON owner.id = c.owner_id

        WHERE c.owner_id = :owner_user_id
        OR c.user_id = :participant_user_id

        ORDER BY
            c.last_message_at DESC,
            c.created_at DESC,
            c.id DESC
    ");

    $stmt->execute([
        'current_user_id' => $userId,
        'owner_user_id' => $userId,
        'participant_user_id' => $userId,
    ]);

    successResponse([
        'conversations' => $stmt->fetchAll(),
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить список диалогов', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Документ структурирован из `php-after-changes/api-conversations-messages-updated.md`. |