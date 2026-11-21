<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdmin();

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->query("
        SELECT
            c.id,
            c.code,
            c.title,
            c.description,
            c.icon,
            c.color,
            c.sort_order,
            c.is_active,
            c.created_at,
            c.updated_at,
            COALESCE(pc.places_count, 0) AS places_count
        FROM categories c
        LEFT JOIN (
            SELECT
                category_id,
                COUNT(*) AS places_count
            FROM places
            GROUP BY category_id
        ) pc
            ON pc.category_id = c.id
        ORDER BY c.sort_order ASC, c.id ASC
    ");

    successResponse([
        'categories' => $stmt->fetchAll(),
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить категории', 500, [
        'error' => $e->getMessage(),
    ]);
}
