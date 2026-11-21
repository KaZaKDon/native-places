<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

$token = trim($_GET['token'] ?? '');

if ($token === '') {
    errorResponse('Не передан токен маршрута', 400);
}

try {
    $pdo = getDatabaseConnection();

    $routeStmt = $pdo->prepare("
        SELECT
            id,
            user_id,
            title,
            description,
            is_public,
            share_token,
            created_at,
            updated_at
        FROM routes
        WHERE share_token = :share_token
        LIMIT 1
    ");

    $routeStmt->execute([
        'share_token' => $token,
    ]);

    $route = $routeStmt->fetch();

    if (!$route) {
        errorResponse('Публичный маршрут не найден', 404);
    }

    $placesStmt = $pdo->prepare("
        SELECT
            rp.id AS route_place_id,
            rp.sort_order,
            rp.note,

            p.id,
            p.title,
            p.slug,
            p.short_description,
            p.cover_image,
            p.address,
            p.latitude,
            p.longitude,
            p.status,

            c.code AS category_code,
            c.title AS category_title,
            c.icon AS category_icon,
            c.color AS category_color,

            pt.code AS type_code,
            pt.title AS type_title

        FROM route_places rp

        INNER JOIN places p
            ON p.id = rp.place_id

        INNER JOIN categories c
            ON c.id = p.category_id

        INNER JOIN place_types pt
            ON pt.id = p.place_type_id

        WHERE rp.route_id = :route_id
        AND p.status = 'published'

        ORDER BY rp.sort_order ASC, rp.id ASC
    ");

    $placesStmt->execute([
        'route_id' => $route['id'],
    ]);

    $places = $placesStmt->fetchAll();

    successResponse([
        'route' => $route,
        'places' => $places,
    ]);
} catch (Throwable $e) {
    errorResponse(
        'Не удалось получить публичный маршрут',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );
}
