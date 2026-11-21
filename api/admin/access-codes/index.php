<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdmin();

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->query("
        SELECT
            id,
            role_code,
            display_name,
            status,
            expires_at,
            last_login_at,
            created_at
        FROM admin_access_codes
        ORDER BY created_at DESC, id DESC
    ");

    successResponse([
        'access_codes' => $stmt->fetchAll(),
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить коды доступа', 500, [
        'error' => $e->getMessage(),
    ]);
}
