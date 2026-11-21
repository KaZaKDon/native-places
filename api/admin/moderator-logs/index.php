<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdmin();

try {
    $pdo = getDatabaseConnection();

    $logsStmt = $pdo->query("
        SELECT
            ml.id,
            ml.moderator_id,
            ml.action_type,
            ml.entity_type,
            ml.entity_id,
            ml.description,
            ml.created_at,

            u.email AS moderator_email,
            u.first_name AS moderator_first_name,
            u.last_name AS moderator_last_name
        FROM moderator_logs ml
        LEFT JOIN users u
            ON u.id = ml.moderator_id
        ORDER BY ml.created_at DESC, ml.id DESC
        LIMIT 200
    ");

    $staffStmt = $pdo->query("
        SELECT
            u.id,
            u.email,
            u.first_name,
            u.last_name,
            r.code AS role_code,
            r.title AS role_title
        FROM users u
        INNER JOIN roles r
            ON r.id = u.role_id
        WHERE r.code IN ('admin', 'moderator')
        ORDER BY
            CASE r.code
                WHEN 'admin' THEN 0
                WHEN 'moderator' THEN 1
                ELSE 2
            END,
            u.first_name ASC,
            u.email ASC
    ");

    successResponse([
        'logs' => $logsStmt->fetchAll(),
        'staff' => $staffStmt->fetchAll(),
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить логи модераторов', 500, [
        'error' => $e->getMessage(),
    ]);
}
