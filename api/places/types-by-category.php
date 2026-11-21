<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

$category = trim($_GET['category'] ?? '');

if ($category === '') {
    errorResponse('Не передан код категории', 400);
}

if (!preg_match('/^[a-z0-9_-]+$/', $category)) {
    errorResponse('Некорректный код категории', 422);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            pt.id,
            pt.category_id,
            pt.code,
            pt.title,
            pt.sort_order,
            c.code AS category_code,
            c.title AS category_title
        FROM place_types pt
        INNER JOIN categories c ON c.id = pt.category_id
        WHERE c.code = :category
        AND c.is_active = 1
        AND pt.is_active = 1
        ORDER BY pt.sort_order ASC, pt.title ASC
    ");

    $stmt->execute([
        'category' => $category,
    ]);

    successResponse([
        'types' => $stmt->fetchAll(),
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить типы объектов', 500, [
        'error' => $e->getMessage(),
    ]);
}
