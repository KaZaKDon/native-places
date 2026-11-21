<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdminOrModerator();

$reportId = (int) ($_GET['id'] ?? 0);

if ($reportId <= 0) {
    errorResponse('Не передан ID жалобы', 422);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            r.id,
            r.place_id,
            r.user_id,
            r.report_type,
            r.message,
            r.status,
            r.created_at,
            r.updated_at,
            r.resolved_at,

            p.title AS place_title,
            p.slug AS place_slug,
            p.status AS place_status,
            p.short_description AS place_short_description,
            p.cover_image,
            p.address,

            u.email AS user_email,
            u.first_name AS user_first_name,
            u.last_name AS user_last_name,
            u.phone AS user_phone,
            u.telegram AS user_telegram
        FROM reports r
        INNER JOIN places p
            ON p.id = r.place_id
        INNER JOIN users u
            ON u.id = r.user_id
        WHERE r.id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $reportId,
    ]);

    $report = $stmt->fetch();

    if (!$report) {
        errorResponse('Жалоба не найдена', 404);
    }

    successResponse([
        'report' => $report,
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить жалобу', 500, [
        'error' => $e->getMessage(),
    ]);
}
