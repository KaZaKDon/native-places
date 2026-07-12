# api/messages/index.php

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

Endpoint возвращает сообщения конкретного диалога.

Дополнительно endpoint может пометить входящие сообщения как прочитанные, если передан query-параметр:

```text
mark_read=1
```

Сообщения помечаются прочитанными только при явном открытии диалога.

## Метод и URL

```http
GET /api/messages/index.php?conversation_id={id}&mark_read=1
```

## Авторизация

Требуется user session.

Endpoint вызывает:

```php
$userId = requireAuth();
```

Пользователь должен быть участником диалога:

- либо `owner_id`;
- либо `user_id`.

## Query params

| Параметр | Тип | Обязательный | Описание |
|---|---|---:|---|
| `conversation_id` | number | да | ID диалога. |
| `mark_read` | number | нет | Если `1`, входящие непрочитанные сообщения помечаются прочитанными. |

## Success response

HTTP `200`

```json
{
  "success": true,
  "data": {
    "conversation_id": 1,
    "messages": [
      {
        "id": 10,
        "conversation_id": 1,
        "sender_id": 20,
        "message_text": "Текст сообщения",
        "attachment_path": null,
        "is_read": 0,
        "created_at": "2026-07-04 10:00:00",
        "sender_name": "Пётр",
        "sender_avatar": "/path/to/avatar.jpg"
      }
    ]
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `400` | `Не передан ID диалога` | `conversation_id` отсутствует или меньше/равен нулю. |
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `404` | `Диалог не найден или нет доступа` | Диалог не найден или текущий пользователь не является участником. |
| `500` | `Не удалось получить сообщения` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint используется при открытии конкретного диалога.
- Для открытия диалога лучше вызывать с `mark_read=1`.
- Для фонового обновления можно вызывать без `mark_read`, если не нужно менять статус прочтения.
- Сообщения уже отсортированы по возрастанию времени:
  - старые сверху;
  - новые снизу.
- Для определения своих сообщений сравнивать `sender_id` с ID текущего пользователя.
- После вызова с `mark_read=1` нужно обновить список диалогов, чтобы пересчитать `unread_count`.

## Backend notes

- Используются таблицы:
  - `conversations`;
  - `messages`;
  - `users`.
- Перед выдачей сообщений проверяется доступ к диалогу.
- Если `mark_read=1`, backend обновляет только входящие сообщения:
  - `sender_id != current_user_id`;
  - `is_read = 0`.
- Сообщения сортируются по:
  - `created_at ASC`;
  - `id ASC`.

## PHP-код

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$conversationId = (int) ($_GET['conversation_id'] ?? 0);
$markRead = (int) ($_GET['mark_read'] ?? 0) === 1;

if ($conversationId <= 0) {
    errorResponse('Не передан ID диалога', 400);
}

try {
    $pdo = getDatabaseConnection();

    $conversationStmt = $pdo->prepare("
        SELECT id
        FROM conversations
        WHERE id = :conversation_id
        AND (
            owner_id = :owner_user_id
            OR user_id = :participant_user_id
        )
        LIMIT 1
    ");

    $conversationStmt->execute([
        'conversation_id' => $conversationId,
        'owner_user_id' => $userId,
        'participant_user_id' => $userId,
    ]);

    if (!$conversationStmt->fetch()) {
        errorResponse('Диалог не найден или нет доступа', 404);
    }

    if ($markRead) {
        $readStmt = $pdo->prepare("
            UPDATE messages
            SET is_read = 1
            WHERE conversation_id = :conversation_id
            AND sender_id != :user_id
            AND is_read = 0
        ");

        $readStmt->execute([
            'conversation_id' => $conversationId,
            'user_id' => $userId,
        ]);
    }

    $messagesStmt = $pdo->prepare("
        SELECT
            m.id,
            m.conversation_id,
            m.sender_id,
            m.message_text,
            m.attachment_path,
            m.is_read,
            m.created_at,

            u.first_name AS sender_name,
            u.avatar AS sender_avatar

        FROM messages m

        INNER JOIN users u
            ON u.id = m.sender_id

        WHERE m.conversation_id = :conversation_id

        ORDER BY m.created_at ASC, m.id ASC
    ");

    $messagesStmt->execute([
        'conversation_id' => $conversationId,
    ]);

    successResponse([
        'conversation_id' => $conversationId,
        'messages' => $messagesStmt->fetchAll(),
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить сообщения', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Документ структурирован из `php-after-changes/api-conversations-messages-updated.md`. |