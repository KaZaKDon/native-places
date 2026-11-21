<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(
    file_get_contents('php://input'),
    true
);

$notificationId = (int) ($input['notification_id'] ?? 0);

if ($notificationId <= 0) {
    errorResponse('Не передан ID уведомления', 400);
}

try {

    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        UPDATE notifications
        SET
            is_read = 1,
            read_at = NOW()
        WHERE id = :notification_id
        AND user_id = :user_id
        LIMIT 1
    ");

    $stmt->execute([
        'notification_id' => $notificationId,
        'user_id' => $userId,
    ]);

    if ($stmt->rowCount() === 0) {
        errorResponse('Уведомление не найдено', 404);
    }

    successResponse([
        'message' => 'Уведомление отмечено как прочитанное',
        'notification_id' => $notificationId,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось обновить уведомление',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );
}
