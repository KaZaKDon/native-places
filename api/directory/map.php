<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';
directoryPublicGetOnly();
// Pilot: bounded amount of geometry; add spatial index / bbox paging before large-scale import.
try {
    $pdo = getDatabaseConnection();
    $stmt = $pdo->query("SELECT id, slug, type, title, region, summary, geometry_geojson FROM directory_entries WHERE status='published' AND geometry_geojson IS NOT NULL AND geometry_geojson <> '' ORDER BY id DESC LIMIT 61");
    $rows = $stmt->fetchAll();
    $truncated = count($rows) > 60;
    $entries = [];
    foreach (array_slice($rows, 0, 60) as $row) {
        $geometry = directoryPublicGeometry($row['geometry_geojson']);
        if (!$geometry) continue;
        unset($row['geometry_geojson']);
        $row['geometry'] = $geometry;
        $entries[] = $row;
    }
    successResponse(['entries' => $entries, 'truncated' => $truncated]);
} catch (Throwable $error) {
    error_log('[directory/map] ' . $error->getMessage());
    errorResponse('Слой справочника временно недоступен', 503);
}
