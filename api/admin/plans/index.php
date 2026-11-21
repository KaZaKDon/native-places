<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdmin();

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->query("
        SELECT
            p.id,
            p.code,
            p.title,
            p.description,
            p.max_places,
            p.duration_days,
            p.price,
            p.is_active,
            p.created_at,
            p.updated_at,
            COALESCE(us.users_count, 0) AS users_count
        FROM plans p
        LEFT JOIN (
            SELECT
                plan_id,
                COUNT(DISTINCT user_id) AS users_count
            FROM user_subscriptions
            WHERE status = 'active'
            GROUP BY plan_id
        ) us
            ON us.plan_id = p.id
        ORDER BY p.price ASC, p.id ASC
    ");

    successResponse([
        'plans' => $stmt->fetchAll(),
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить тарифы', 500, [
        'error' => $e->getMessage(),
    ]);
}
