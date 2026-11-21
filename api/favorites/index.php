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
            f.id AS favorite_id,
            f.created_at AS favorite_created_at,

            p.id,
            p.title,
            p.slug,
            p.short_description,
            p.cover_image,
            p.address,

            c.code AS category_code,
            c.title AS category_title,

            pt.code AS type_code,
            pt.title AS type_title

        FROM favorites f

        INNER JOIN places p
            ON p.id = f.place_id

        INNER JOIN categories c
            ON c.id = p.category_id

        INNER JOIN place_types pt
            ON pt.id = p.place_type_id

        WHERE f.user_id = :user_id

        ORDER BY f.created_at DESC
    ");

    $stmt->execute([
        'user_id' => $userId,
    ]);

    $favorites = $stmt->fetchAll();

    successResponse([
        'favorites' => $favorites,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось получить избранное',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );

}
