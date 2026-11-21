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

$imageId = (int) ($input['image_id'] ?? 0);

if ($imageId <= 0) {
    errorResponse('Не передан ID фотографии', 400);
}

try {

    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            pi.id,
            pi.place_id,
            pi.image_path
        FROM place_images pi
        INNER JOIN places p
            ON p.id = pi.place_id
        WHERE pi.id = :image_id
        AND p.user_id = :user_id
        LIMIT 1
    ");

    $stmt->execute([
        'image_id' => $imageId,
        'user_id' => $userId,
    ]);

    $image = $stmt->fetch();

    if (!$image) {
        errorResponse('Фотография не найдена или нет доступа', 404);
    }

    $resetStmt = $pdo->prepare("
        UPDATE place_images
        SET is_cover = 0
        WHERE place_id = :place_id
    ");

    $resetStmt->execute([
        'place_id' => $image['place_id'],
    ]);

    $coverStmt = $pdo->prepare("
        UPDATE place_images
        SET is_cover = 1
        WHERE id = :image_id
        LIMIT 1
    ");

    $coverStmt->execute([
        'image_id' => $imageId,
    ]);

    $placeStmt = $pdo->prepare("
        UPDATE places
        SET
            cover_image = :cover_image,
            updated_at = NOW()
        WHERE id = :place_id
        LIMIT 1
    ");

    $placeStmt->execute([
        'cover_image' => $image['image_path'],
        'place_id' => $image['place_id'],
    ]);

    successResponse([
        'message' => 'Обложка успешно обновлена',
        'image_id' => $imageId,
        'place_id' => (int) $image['place_id'],
        'cover_image' => $image['image_path'],
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось обновить обложку',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );
}
