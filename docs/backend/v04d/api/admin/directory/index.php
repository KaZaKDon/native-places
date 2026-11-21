<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';
directoryRequireMethod('GET');
requireAdmin();
try {
    $pdo = getDatabaseConnection();
    $stmt = $pdo->query("SELECT e.id, e.slug, e.type, e.title, e.region, e.summary, e.body, e.source_url, e.geometry_geojson, e.status, e.created_at, e.updated_at,
        t.official_category, t.official_name, t.managing_body, t.legal_basis_url, t.boundary_source_url, t.access_rules, t.access_source_url, t.checked_at
        FROM directory_entries e LEFT JOIN directory_territory_details t ON t.entry_id=e.id ORDER BY e.updated_at DESC, e.id DESC LIMIT 500");
    successResponse(['entries' => $stmt->fetchAll(), 'csrf_token' => directoryCsrfToken()]);
} catch (Throwable $error) {
    error_log('Directory index: ' . $error->getMessage());
    errorResponse('Не удалось загрузить справочник мест', 500);
}
