<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdmin();

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->query("
        SELECT
            pt.id,
            pt.category_id,
            pt.code,
            pt.title,
            pt.sort_order,
            pt.is_active,
            pt.created_at,
            pt.updated_at,

            c.code AS category_code,
            c.title AS category_title,

            COALESCE(pc.places_count, 0) AS places_count
        FROM place_types pt
        INNER JOIN categories c
            ON c.id = pt.category_id
        LEFT JOIN (
            SELECT
                place_type_id,
                COUNT(*) AS places_count
            FROM places
            GROUP BY place_type_id
        ) pc
            ON pc.place_type_id = pt.id
        ORDER BY c.sort_order ASC, pt.sort_order ASC, pt.id ASC
    ");

    $categoriesStmt = $pdo->query("
        SELECT
            id,
            code,
            title
        FROM categories
        WHERE is_active = 1
        ORDER BY sort_order ASC, id ASC
    ");

    successResponse([
        'types' => $stmt->fetchAll(),
        'categories' => $categoriesStmt->fetchAll(),
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить типы объектов', 500, [
        'error' => $e->getMessage(),
    ]);
}
