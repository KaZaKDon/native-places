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
