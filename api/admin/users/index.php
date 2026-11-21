<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdminOrModerator();

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->query("
        SELECT
            u.id,
            u.role_id,
            u.email,
            u.first_name,
            u.last_name,
            u.profile_status,
            u.phone,
            u.telegram,
            u.avatar,
            u.status,
            u.created_at,
            u.updated_at,
            r.code AS role_code,
            r.title AS role_title,
            COALESCE(pc.places_count, 0) AS places_count
        FROM users u
        INNER JOIN roles r
            ON r.id = u.role_id
        LEFT JOIN (
            SELECT
                user_id,
                COUNT(*) AS places_count
            FROM places
            GROUP BY user_id
        ) pc
            ON pc.user_id = u.id
        ORDER BY u.created_at DESC, u.id DESC
    ");

    successResponse([
        'users' => $stmt->fetchAll(),
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить список пользователей', 500, [
        'error' => $e->getMessage(),
    ]);
}
