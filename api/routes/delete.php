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

$routeId = (int) ($input['route_id'] ?? 0);

if ($routeId <= 0) {
    errorResponse('Не передан ID маршрута', 400);
}

try {

    $pdo = getDatabaseConnection();

    $routeStmt = $pdo->prepare("
        SELECT id
        FROM routes
        WHERE id = :route_id
        AND user_id = :user_id
        LIMIT 1
    ");

    $routeStmt->execute([
        'route_id' => $routeId,
        'user_id' => $userId,
    ]);

    $route = $routeStmt->fetch();

    if (!$route) {
        errorResponse('Маршрут не найден или нет доступа', 404);
    }

    $pdo->beginTransaction();

    $deletePlacesStmt = $pdo->prepare("
        DELETE FROM route_places
        WHERE route_id = :route_id
    ");

    $deletePlacesStmt->execute([
        'route_id' => $routeId,
    ]);

    $deleteRouteStmt = $pdo->prepare("
        DELETE FROM routes
        WHERE id = :route_id
        LIMIT 1
    ");

    $deleteRouteStmt->execute([
        'route_id' => $routeId,
    ]);

    $pdo->commit();

    successResponse([
        'message' => 'Маршрут успешно удалён',
        'route_id' => $routeId,
    ]);

} catch (Throwable $e) {

    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse(
        'Не удалось удалить маршрут',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );
}
