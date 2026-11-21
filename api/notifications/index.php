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
