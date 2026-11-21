<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = getCurrentUserId();

$placeId = (int) ($_GET['place_id'] ?? 0);

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

if (!$userId) {
    successResponse([
        'is_favorite' => false,
    ]);
}

try {

    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT id
        FROM favorites
        WHERE user_id = :user_id
        AND place_id = :place_id
        LIMIT 1
    ");

    $stmt->execute([
        'user_id' => $userId,
        'place_id' => $placeId,
    ]);

    $favorite = $stmt->fetch();

    successResponse([
        'is_favorite' => (bool) $favorite,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось проверить избранное',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );

}
