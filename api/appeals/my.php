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
            user_id,
            appeal_type,
            contact,
            message,
            admin_response,
            status,
            created_at,
            updated_at,
            closed_at
        FROM appeals
        WHERE user_id = :user_id
        ORDER BY created_at DESC, id DESC
    ");

    $stmt->execute([
        'user_id' => $userId,
    ]);

    successResponse([
        'appeals' => $stmt->fetchAll(),
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить обращения', 500, [
        'error' => $e->getMessage(),
    ]);
}
