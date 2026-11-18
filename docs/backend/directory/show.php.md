<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';
directoryPublicGetOnly();
$type = trim((string) ($_GET['type'] ?? ''));
$slug = trim((string) ($_GET['slug'] ?? ''));
if (!directoryPublicType($type) || !preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/D', $slug)) {
    errorResponse('Неверный адрес справочного объекта', 422);
}
try {
    $pdo = getDatabaseConnection();
    $stmt = $pdo->prepare("SELECT id, slug, type, title, region, summary, body, source_url, geometry_geojson, published_at, updated_at FROM directory_entries WHERE status='published' AND type=:type AND slug=:slug LIMIT 1");
    $stmt->execute(['type' => $type, 'slug' => $slug]);
    $entry = $stmt->fetch();
    if (!$entry) errorResponse('Справочный объект не найден', 404);
    $entry['geometry'] = directoryPublicGeometry($entry['geometry_geojson']);
    unset($entry['geometry_geojson']);
    $entry['species'] = [];
    if (in_array($entry['type'], ['river','lake'], true)) {
        // Only validated, published species with a published occurrence on this entry.
        // Do not leak draft segment details or private observation notes.
        $fish = $pdo->prepare("SELECT DISTINCT s.slug,s.common_name,s.scientific_name,s.summary,
            (SELECT m.id FROM directory_media_links l JOIN directory_media m ON m.id=l.media_id AND m.status='published'
             WHERE l.species_id=s.id ORDER BY l.is_cover DESC,l.sort_order ASC,m.id ASC LIMIT 1) AS cover_image_id
            FROM directory_species_occurrences o
            JOIN directory_species s ON s.id=o.species_id AND s.status='published' AND s.kind='fish'
            WHERE o.entry_id=:entry AND o.status='published'
            ORDER BY s.common_name ASC LIMIT 80");
        $fish->execute(['entry'=>$entry['id']]);
        $entry['species'] = $fish->fetchAll(PDO::FETCH_ASSOC);
    }
    successResponse(['entry' => $entry]);
} catch (Throwable $error) {
    error_log('[directory/show] ' . $error->getMessage());
    errorResponse('Справочник временно недоступен', 503);
}
