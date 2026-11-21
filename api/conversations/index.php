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
