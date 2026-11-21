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
$placeId = (int) ($input['place_id'] ?? 0);
$note = trim($input['note'] ?? '');

if ($routeId <= 0) {
    errorResponse('Не передан ID маршрута', 400);
}

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

try {

    $pdo = getDatabaseConnection();

    $routeStmt = $pdo->prepare("
        SELECT id
        FROM routes
        WHERE id = :route_id
        AND user_id = :user_id
        AND status = 'active'
        LIMIT 1
    ");

    $routeStmt->execute([
        'route_id' => $routeId,
        'user_id' => $userId,
    ]);

    $route = $routeStmt->fetch();

    if (!$route) {
        errorResponse('Активный маршрут не найден или нет доступа', 404);
    }

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
        errorResponse('Объект не найден или не опубликован', 404);
    }

    $existsStmt = $pdo->prepare("
        SELECT id
        FROM route_places
        WHERE route_id = :route_id
        AND place_id = :place_id
        LIMIT 1
    ");

    $existsStmt->execute([
        'route_id' => $routeId,
        'place_id' => $placeId,
    ]);

    if ($existsStmt->fetch()) {
        errorResponse('Объект уже добавлен в маршрут', 422);
    }

    $orderStmt = $pdo->prepare("
        SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order
        FROM route_places
        WHERE route_id = :route_id
    ");

    $orderStmt->execute([
        'route_id' => $routeId,
    ]);

    $sortOrder = (int) $orderStmt->fetch()['next_order'];

    $insertStmt = $pdo->prepare("
        INSERT INTO route_places (
            route_id,
            place_id,
            sort_order,
            note,
            created_at
        ) VALUES (
            :route_id,
            :place_id,
            :sort_order,
            :note,
            NOW()
        )
    ");

    $insertStmt->execute([
        'route_id' => $routeId,
        'place_id' => $placeId,
        'sort_order' => $sortOrder,
        'note' => $note !== '' ? $note : null,
    ]);

    $updateRouteStmt = $pdo->prepare("
        UPDATE routes
        SET updated_at = NOW()
        WHERE id = :route_id
        LIMIT 1
    ");

    $updateRouteStmt->execute([
        'route_id' => $routeId,
    ]);

    successResponse([
        'message' => 'Объект добавлен в маршрут',
        'route_id' => $routeId,
        'place_id' => $placeId,
        'sort_order' => $sortOrder,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось добавить объект в маршрут',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );
}
