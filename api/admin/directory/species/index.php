<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';
directoryRequireMethod('GET');
requireAdmin();
try {
    $pdo = getDatabaseConnection();
    $rows = $pdo->query('SELECT id, slug, kind, common_name, scientific_name, summary, body, status, created_at, updated_at FROM directory_species ORDER BY kind ASC, common_name ASC, id ASC LIMIT 500')->fetchAll();
    header('Cache-Control: no-store');
    successResponse(['species' => $rows]);
} catch (Throwable $e) {
    error_log('[directory/species/index] ' . $e->getMessage());
    errorResponse('Не удалось загрузить виды', 500);
}
