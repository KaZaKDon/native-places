<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$placeId = (int) ($_GET['place_id'] ?? 0);

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

try {

    $pdo = getDatabaseConnection();

    $placeStmt = $pdo->prepare("
        SELECT id
        FROM places
        WHERE id = :id
        AND user_id = :user_id
        LIMIT 1
    ");

    $placeStmt->execute([
        'id' => $placeId,
        'user_id' => $userId,
    ]);

    $place = $placeStmt->fetch();

    if (!$place) {
        errorResponse('Объект не найден или нет доступа', 404);
    }

    $imagesStmt = $pdo->prepare("
        SELECT
            id,
            image_path,
            sort_order,
            is_cover,
            created_at
        FROM place_images
        WHERE place_id = :place_id
        ORDER BY sort_order ASC, id ASC
    ");

    $imagesStmt->execute([
        'place_id' => $placeId,
    ]);

    $images = $imagesStmt->fetchAll();

    successResponse([
        'place_id' => $placeId,
        'images' => $images,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось получить фотографии',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );
}
