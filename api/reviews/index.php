<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

$placeId = (int) ($_GET['place_id'] ?? 0);

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

try {

    $pdo = getDatabaseConnection();

    $placeStmt = $pdo->prepare("
        SELECT id
        FROM places
        WHERE id = :place_id
        AND status = 'published'
        LIMIT 1
    ");

    $placeStmt->execute([
        'place_id' => $placeId,
    ]);

    $place = $placeStmt->fetch();

    if (!$place) {
        errorResponse('Объект не найден', 404);
    }

    $stmt = $pdo->prepare("
        SELECT
            r.id,
            r.place_id,
            r.user_id,
            r.review_text,
            r.status,
            r.created_at,

            u.first_name AS user_name,
            u.avatar AS user_avatar

        FROM reviews r

        INNER JOIN users u
            ON u.id = r.user_id

        WHERE r.place_id = :place_id
        AND r.status = 'published'

        ORDER BY r.created_at DESC, r.id DESC
    ");

    $stmt->execute([
        'place_id' => $placeId,
    ]);

    $reviews = $stmt->fetchAll();

    successResponse([
        'place_id' => $placeId,
        'reviews' => $reviews,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось получить отзывы',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );
}
