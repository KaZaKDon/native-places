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
