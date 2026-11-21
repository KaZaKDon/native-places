<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/request.php';
require_once __DIR__ . '/../config/database.php';

requireHttpMethod('GET');

try {
    $pdo = getDatabaseConnection();
    $stmt = $pdo->query('
        SELECT pt.id, pt.category_id, pt.code, pt.title, pt.sort_order,
               c.code AS category_code, c.title AS category_title
        FROM place_types AS pt
        INNER JOIN categories AS c ON c.id = pt.category_id
        WHERE pt.is_active = 1 AND c.is_active = 1
        ORDER BY c.sort_order ASC, pt.sort_order ASC, pt.id ASC
    ');

    successResponse(['types' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
} catch (Throwable $error) {
    error_log('[api/place-types/index] ' . $error->getMessage());
    errorResponse('Не удалось получить типы объектов', 500);
}
