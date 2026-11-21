<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdmin();

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->query("
        SELECT
            id,
            subject,
            audience_type,
            audience_value,
            status,
            recipients_count,
            sent_count,
            failed_count,
            created_by_name,
            error_message,
            created_at,
            sent_at
        FROM mailings
        ORDER BY created_at DESC, id DESC
    ");

    successResponse([
        'mailings' => $stmt->fetchAll(),
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить список рассылок', 500, [
        'error' => $e->getMessage(),
    ]);
}
