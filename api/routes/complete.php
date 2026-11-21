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
        SELECT
            id,
            status
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

    if ($route['status'] !== 'active') {
        errorResponse('Завершить можно только активный маршрут', 422);
    }

    $updateStmt = $pdo->prepare("
        UPDATE routes
        SET
            status = 'completed',
            completed_at = NOW(),
            archived_at = NULL,
            updated_at = NOW()
        WHERE id = :route_id
        LIMIT 1
    ");

    $updateStmt->execute([
        'route_id' => $routeId,
    ]);

    successResponse([
        'message' => 'Маршрут завершён',
        'route_id' => $routeId,
        'status' => 'completed',
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось завершить маршрут',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );

}
