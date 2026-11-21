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
            pi.image_path,
            pi.is_cover
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

    $deleteStmt = $pdo->prepare("
        DELETE FROM place_images
        WHERE id = :id
        LIMIT 1
    ");

    $deleteStmt->execute([
        'id' => $imageId,
    ]);

    $filePath = __DIR__ . '/../..' . $image['image_path'];

    if (is_file($filePath)) {
        unlink($filePath);
    }

    if ((int) $image['is_cover'] === 1) {
        $nextCoverStmt = $pdo->prepare("
            SELECT
                id,
                image_path
            FROM place_images
            WHERE place_id = :place_id
            ORDER BY sort_order ASC, id ASC
            LIMIT 1
        ");

        $nextCoverStmt->execute([
            'place_id' => $image['place_id'],
        ]);

        $nextCover = $nextCoverStmt->fetch();

        if ($nextCover) {
            $setCoverStmt = $pdo->prepare("
                UPDATE place_images
                SET is_cover = CASE
                    WHEN id = :image_id THEN 1
                    ELSE 0
                END
                WHERE place_id = :place_id
            ");

            $setCoverStmt->execute([
                'image_id' => $nextCover['id'],
                'place_id' => $image['place_id'],
            ]);

            $updatePlaceStmt = $pdo->prepare("
                UPDATE places
                SET cover_image = :cover_image
                WHERE id = :place_id
                LIMIT 1
            ");

            $updatePlaceStmt->execute([
                'cover_image' => $nextCover['image_path'],
                'place_id' => $image['place_id'],
            ]);
        } else {
            $clearCoverStmt = $pdo->prepare("
                UPDATE places
                SET cover_image = NULL
                WHERE id = :place_id
                LIMIT 1
            ");

            $clearCoverStmt->execute([
                'place_id' => $image['place_id'],
            ]);
        }
    }

    successResponse([
        'message' => 'Фотография удалена',
        'image_id' => $imageId,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось удалить фотографию',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );
}
