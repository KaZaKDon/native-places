<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdminOrModerator();

$reviewId = (int) ($_GET['id'] ?? 0);

if ($reviewId <= 0) {
    errorResponse('Не передан ID отзыва', 422);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            r.id,
            r.place_id,
            r.user_id,
            r.review_text,
            r.status,
            r.created_at,
            r.updated_at,
            r.moderated_at,

            p.title AS place_title,
            p.slug AS place_slug,
            p.status AS place_status,
            p.short_description AS place_short_description,
            p.cover_image,

            u.email AS user_email,
            u.first_name AS user_first_name,
            u.last_name AS user_last_name,
            u.avatar AS user_avatar,
            u.phone AS user_phone,
            u.telegram AS user_telegram
        FROM reviews r
        INNER JOIN places p
            ON p.id = r.place_id
        INNER JOIN users u
            ON u.id = r.user_id
        WHERE r.id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $reviewId,
    ]);

    $review = $stmt->fetch();

    if (!$review) {
        errorResponse('Отзыв не найден', 404);
    }

    successResponse([
        'review' => $review,
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить отзыв', 500, [
        'error' => $e->getMessage(),
    ]);
}
