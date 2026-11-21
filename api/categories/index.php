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
        SELECT id, code, title, description, icon, color, sort_order
        FROM categories
        WHERE is_active = 1
        ORDER BY sort_order ASC, id ASC
    ');

    successResponse(['categories' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
} catch (Throwable $error) {
    error_log('[api/categories/index] ' . $error->getMessage());
    errorResponse('Не удалось получить категории', 500);
}
