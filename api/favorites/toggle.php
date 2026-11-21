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

$placeId = (int) ($input['place_id'] ?? 0);

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

try {
    $pdo = getDatabaseConnection();

    $placeStmt = $pdo->prepare("
        SELECT id
        FROM places
        WHERE id = :id
        AND status = 'published'
        LIMIT 1
    ");

    $placeStmt->execute([
        'id' => $placeId,
    ]);

    $place = $placeStmt->fetch();

    if (!$place) {
        errorResponse('Объект не найден', 404);
    }

    $favoriteStmt = $pdo->prepare("
        SELECT id
        FROM favorites
        WHERE user_id = :user_id
        AND place_id = :place_id
        LIMIT 1
    ");

    $favoriteStmt->execute([
        'user_id' => $userId,
        'place_id' => $placeId,
    ]);

    $favorite = $favoriteStmt->fetch();

    if ($favorite) {
        $deleteStmt = $pdo->prepare("
            DELETE FROM favorites
            WHERE id = :id
            LIMIT 1
        ");

        $deleteStmt->execute([
            'id' => $favorite['id'],
        ]);

        successResponse([
            'message' => 'Объект удалён из избранного',
            'place_id' => $placeId,
            'is_favorite' => false,
            'action' => 'removed',
        ]);
    }

    $insertStmt = $pdo->prepare("
        INSERT INTO favorites (
            user_id,
            place_id
        ) VALUES (
            :user_id,
            :place_id
        )
    ");

    $insertStmt->execute([
        'user_id' => $userId,
        'place_id' => $placeId,
    ]);

    successResponse([
        'message' => 'Объект добавлен в избранное',
        'place_id' => $placeId,
        'is_favorite' => true,
        'action' => 'added',
    ]);

} catch (Throwable $e) {
    errorResponse('Не удалось изменить избранное', 500, [
        'error' => $e->getMessage(),
    ]);
}
