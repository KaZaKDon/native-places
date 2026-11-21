<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdminOrModerator();

$appealId = (int) ($_GET['id'] ?? 0);

if ($appealId <= 0) {
    errorResponse('Не передан ID обращения', 422);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            a.id,
            a.user_id,
            a.appeal_type,
            a.contact,
            a.message,
            a.admin_response,
            a.status,
            a.created_at,
            a.updated_at,
            a.closed_at,

            u.email AS user_email,
            u.first_name AS user_first_name,
            u.last_name AS user_last_name,
            u.phone AS user_phone,
            u.telegram AS user_telegram,
            u.avatar AS user_avatar,
            u.status AS user_status
        FROM appeals a
        INNER JOIN users u
            ON u.id = a.user_id
        WHERE a.id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $appealId,
    ]);

    $appeal = $stmt->fetch();

    if (!$appeal) {
        errorResponse('Обращение не найдено', 404);
    }

    successResponse([
        'appeal' => $appeal,
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить обращение', 500, [
        'error' => $e->getMessage(),
    ]);
}
