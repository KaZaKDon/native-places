<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

try {

    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            r.id,
            r.title,
            r.description,
            r.is_public,
            r.share_token,
            r.created_at,
            r.updated_at,

            COUNT(rp.id) AS places_count

        FROM routes r

        LEFT JOIN route_places rp
            ON rp.route_id = r.id

        WHERE r.user_id = :user_id

        GROUP BY r.id

        ORDER BY r.updated_at DESC, r.id DESC
    ");

    $stmt->execute([
        'user_id' => $userId,
    ]);

    $routes = $stmt->fetchAll();

    successResponse([
        'routes' => $routes,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось получить маршруты',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );

}
