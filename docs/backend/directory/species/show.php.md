<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';
directoryPublicGetOnly();
$slug = publicSpeciesSlug($_GET['slug'] ?? null);
try {
    $pdo = getDatabaseConnection();
    $stmt = $pdo->prepare("SELECT s.id,s.slug,s.kind,s.common_name,s.scientific_name,s.summary,s.body,s.published_at,s.updated_at,
        " . publicSpeciesCoverSql() . " AS cover_image_id
        FROM directory_species s WHERE s.status='published' AND s.kind='fish' AND s.slug=:slug AND " . publicSpeciesVisibleSql() . " LIMIT 1");
    $stmt->execute(['slug'=>$slug]);
    $species = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$species) errorResponse('Вид не найден или не опубликован', 404);
    // Do not expose private notes, source comments or unpublished segment names.
    $cover = null;
    if (!empty($species['cover_image_id'])) {
        $coverQuery = $pdo->prepare("SELECT m.id,m.caption,m.alt_text,m.author,m.license_name,m.attribution
            FROM directory_media m JOIN directory_media_links l ON l.media_id=m.id
            WHERE m.id=:id AND l.species_id=:species AND m.status='published' LIMIT 1");
        $coverQuery->execute(['id'=>$species['cover_image_id'],'species'=>$species['id']]);
        $cover = $coverQuery->fetch(PDO::FETCH_ASSOC) ?: null;
    }
    $occ = $pdo->prepare("SELECT DISTINCT e.type,e.slug AS entry_slug,e.title AS entry_title,e.region,
        o.evidence_level,o.verified_at,src.source_kind,src.title AS source_title,
        CASE WHEN seg.status='published' THEN seg.title ELSE NULL END AS segment_title,
        CASE WHEN seg.status='published' THEN seg.slug ELSE NULL END AS segment_slug
        FROM directory_species_occurrences o
        JOIN directory_entries e ON e.id=o.entry_id AND e.status='published'
        JOIN directory_sources src ON src.id=o.source_id
        LEFT JOIN directory_segments seg ON seg.id=o.segment_id
        WHERE o.species_id=:id AND o.status='published'
        ORDER BY e.title, src.title LIMIT 120");
    $occ->execute(['id'=>$species['id']]);
    successResponse(['species'=>$species,'cover'=>$cover,'occurrences'=>$occ->fetchAll(PDO::FETCH_ASSOC)]);
} catch (Throwable $e) {
    error_log('[directory/species/show] '.$e->getMessage());
    errorResponse('Сведения о виде временно недоступны', 503);
}
