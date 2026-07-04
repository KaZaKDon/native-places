# Обновлённые PHP endpoint-ы для диалогов и сообщений

Ниже код для замены/создания файлов на хостинге. Цель — сразу закрыть текущие доработки по сообщениям:

- список диалогов возвращает `message_count` и `unread_count`;
- диалоги сортируются по последнему сообщению;
- карточка диалога может показать последнее сообщение без отдельного подсчёта на фронте;
- входящие сообщения помечаются прочитанными только при открытии диалога (`mark_read=1`);
- пустое сообщение не отправляется;
- по архивному/удалённому/неопубликованному объявлению нельзя создать новый диалог и нельзя продолжать переписку.

## `api/conversations/index.php`

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

## `api/conversations/start.php`

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

## `api/messages/index.php`

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

## `api/messages/send.php`

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