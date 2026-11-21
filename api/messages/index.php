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
