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
$items = $input['items'] ?? [];

if ($routeId <= 0) {
    errorResponse('Не передан ID маршрута', 400);
}

if (!is_array($items)) {
    errorResponse('Некорректный список точек маршрута', 422);
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

    $updateStmt = $pdo->prepare("
        UPDATE route_places
        SET sort_order = :sort_order
        WHERE id = :id
        AND route_id = :route_id
    ");

    foreach ($items as $index => $routePlaceId) {

        $updateStmt->execute([
            'sort_order' => $index + 1,
            'id' => (int) $routePlaceId,
            'route_id' => $routeId,
        ]);
    }

    $pdo->commit();

    successResponse([
        'message' => 'Порядок точек маршрута обновлён',
        'route_id' => $routeId,
    ]);

} catch (Throwable $e) {

    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse(
        'Не удалось обновить порядок маршрута',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );
}
