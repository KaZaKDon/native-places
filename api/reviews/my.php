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
            r.review_text,
            r.status,
            r.created_at,
            r.moderated_at,

            p.title AS place_title,
            p.slug AS place_slug,
            p.cover_image

        FROM reviews r

        INNER JOIN places p
            ON p.id = r.place_id

        WHERE r.user_id = :user_id

        ORDER BY r.created_at DESC, r.id DESC
    ");

    $stmt->execute([
        'user_id' => $userId,
    ]);

    $reviews = $stmt->fetchAll();

    successResponse([
        'reviews' => $reviews,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось получить отзывы пользователя',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );
}
