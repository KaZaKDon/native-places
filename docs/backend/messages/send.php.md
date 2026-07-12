# api/messages/send.php

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

Endpoint отправляет сообщение в существующий диалог.

Сообщение нельзя отправить:

- если диалог не найден;
- если текущий пользователь не участник диалога;
- если объявление архивное или неопубликованное;
- если срок публикации объявления истёк;
- если объявление ожидает оплату;
- если текст сообщения пустой.

## Метод и URL

```http
POST /api/messages/send.php
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

## Request

Тело запроса передаётся в формате JSON.

```json
{
  "conversation_id": 1,
  "message_text": "Здравствуйте!"
}
```

## Request fields

| Поле | Тип | Обязательное | Правила |
|---|---|---:|---|
| `conversation_id` | number | да | ID диалога. |
| `message_text` | string | да | Не пустой текст сообщения. Если длиннее 2000 символов, backend обрежет до 2000. |

## Success response

HTTP `201`

```json
{
  "success": true,
  "data": {
    "message": "Сообщение отправлено",
    "item": {
      "id": 10,
      "conversation_id": 1,
      "sender_id": 20,
      "message_text": "Здравствуйте!",
      "attachment_path": null,
      "is_read": 0,
      "created_at": "2026-07-04 10:00:00"
    }
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `400` | `Некорректный JSON` | Тело запроса не является JSON-объектом. |
| `400` | `Не передан ID диалога` | `conversation_id` отсутствует или меньше/равен нулю. |
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `404` | `Диалог не найден или нет доступа` | Диалог не найден или текущий пользователь не является участником. |
| `422` | `Введите текст сообщения` | `message_text` пустой после trim. |
| `422` | `По архивному или неопубликованному объявлению нельзя отправлять сообщения` | Связанное объявление не опубликовано. |
| `422` | `Срок публикации объявления истёк` | `expires_at` меньше текущего времени. |
| `422` | `Объявление ожидает оплату` | `payment_status` не `not_required` и не `paid`. |
| `500` | `Не удалось отправить сообщение` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint используется в форме отправки сообщения внутри диалога.
- Перед отправкой желательно на фронте проверить, что текст не пустой.
- После успешной отправки можно добавить `item` в локальный список сообщений.
- После успешной отправки нужно обновить список диалогов, так как backend обновляет `last_message_at`.
- Если сообщение длиннее 2000 символов, backend обрежет его. На фронте лучше тоже поставить лимит 2000.
- При `422` нужно показать текст ошибки пользователю.
- При `404` лучше вернуть пользователя к списку диалогов или показать, что диалог недоступен.

## Backend notes

- Используются таблицы:
  - `conversations`;
  - `places`;
  - `messages`.
- Перед отправкой проверяется доступ к диалогу.
- Дополнительно проверяется статус связанного объявления.
- Сообщение создаётся с:
  - `is_read = 0`;
  - `attachment_path = null` в ответе.
- После вставки сообщения обновляется:
  - `conversations.last_message_at`;
  - `conversations.updated_at`.
- Endpoint сейчас не обрабатывает вложения, только текст.

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

$conversationId = (int) ($input['conversation_id'] ?? 0);
$messageText = trim($input['message_text'] ?? '');

if ($conversationId <= 0) {
    errorResponse('Не передан ID диалога', 400);
}

if ($messageText === '') {
    errorResponse('Введите текст сообщения', 422);
}

if (mb_strlen($messageText) > 2000) {
    $messageText = mb_substr($messageText, 0, 2000);
}

try {
    $pdo = getDatabaseConnection();

    $conversationStmt = $pdo->prepare("
        SELECT
            c.id,
            p.status AS place_status,
            p.expires_at,
            p.payment_status
        FROM conversations c
        INNER JOIN places p
            ON p.id = c.place_id
        WHERE c.id = :conversation_id
        AND (
            c.owner_id = :owner_user_id
            OR c.user_id = :participant_user_id
        )
        LIMIT 1
    ");

    $conversationStmt->execute([
        'conversation_id' => $conversationId,
        'owner_user_id' => $userId,
        'participant_user_id' => $userId,
    ]);

    $conversation = $conversationStmt->fetch();

    if (!$conversation) {
        errorResponse('Диалог не найден или нет доступа', 404);
    }

    if ($conversation['place_status'] !== 'published') {
        errorResponse('По архивному или неопубликованному объявлению нельзя отправлять сообщения', 422);
    }

    if ($conversation['expires_at'] !== null && strtotime($conversation['expires_at']) < time()) {
        errorResponse('Срок публикации объявления истёк', 422);
    }

    if ($conversation['payment_status'] !== null && !in_array($conversation['payment_status'], ['not_required', 'paid'], true)) {
        errorResponse('Объявление ожидает оплату', 422);
    }

    $insertStmt = $pdo->prepare("
        INSERT INTO messages (
            conversation_id,
            sender_id,
            message_text,
            is_read,
            created_at
        ) VALUES (
            :conversation_id,
            :sender_id,
            :message_text,
            0,
            NOW()
        )
    ");

    $insertStmt->execute([
        'conversation_id' => $conversationId,
        'sender_id' => $userId,
        'message_text' => $messageText,
    ]);

    $messageId = (int) $pdo->lastInsertId();

    $updateStmt = $pdo->prepare("
        UPDATE conversations
        SET
            last_message_at = NOW(),
            updated_at = NOW()
        WHERE id = :conversation_id
        LIMIT 1
    ");

    $updateStmt->execute([
        'conversation_id' => $conversationId,
    ]);

    successResponse([
        'message' => 'Сообщение отправлено',
        'item' => [
            'id' => $messageId,
            'conversation_id' => $conversationId,
            'sender_id' => $userId,
            'message_text' => $messageText,
            'attachment_path' => null,
            'is_read' => 0,
            'created_at' => date('Y-m-d H:i:s'),
        ],
    ], 201);
} catch (Throwable $e) {
    errorResponse('Не удалось отправить сообщение', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Документ структурирован из `php-after-changes/api-conversations-messages-updated.md`. |