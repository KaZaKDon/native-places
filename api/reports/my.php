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
            r.id,
            r.place_id,
            r.report_type,
            r.message,
            r.status,
            r.created_at,
            r.resolved_at,

            p.title AS place_title,
            p.slug AS place_slug,
            p.cover_image

        FROM reports r

        INNER JOIN places p
            ON p.id = r.place_id

        WHERE r.user_id = :user_id

        ORDER BY r.created_at DESC, r.id DESC
    ");

    $stmt->execute([
        'user_id' => $userId,
    ]);

    $reports = $stmt->fetchAll();

    successResponse([
        'reports' => $reports,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось получить жалобы пользователя',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );
}
