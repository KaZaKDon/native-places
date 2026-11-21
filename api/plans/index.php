<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->query("
        SELECT
            id,
            code,
            title,
            description,
            max_places,
            duration_days,
            price,
            is_active
        FROM plans
        WHERE is_active = 1
        ORDER BY price ASC, id ASC
    ");

    successResponse([
        'plans' => $stmt->fetchAll(),
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить тарифы', 500, [
        'error' => $e->getMessage(),
    ]);
}
