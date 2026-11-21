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

$routePlaceId = (int) ($input['route_place_id'] ?? 0);

if ($routePlaceId <= 0) {
    errorResponse('Не передан ID точки маршрута', 400);
}

try {

    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            rp.id,
            rp.route_id
        FROM route_places rp
        INNER JOIN routes r
            ON r.id = rp.route_id
        WHERE rp.id = :id
        AND r.user_id = :user_id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $routePlaceId,
        'user_id' => $userId,
    ]);

    $routePlace = $stmt->fetch();

    if (!$routePlace) {
        errorResponse('Точка маршрута не найдена', 404);
    }

    $deleteStmt = $pdo->prepare("
        DELETE FROM route_places
        WHERE id = :id
        LIMIT 1
    ");

    $deleteStmt->execute([
        'id' => $routePlaceId,
    ]);

    successResponse([
        'message' => 'Точка удалена из маршрута',
        'route_place_id' => $routePlaceId,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось удалить точку маршрута',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );
}
