<?php
declare(strict_types=1);
require_once __DIR__ . '/../_bootstrap.php';

function publicSpeciesSlug(mixed $value): string {
    $slug = is_string($value) ? trim($value) : '';
    if (!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/D', $slug)) errorResponse('Некорректный адрес вида', 422);
    return $slug;
}
function publicSpeciesCoverSql(): string {
    return '(SELECT m.id FROM directory_media_links ml JOIN directory_media m ON m.id=ml.media_id
        WHERE ml.species_id=s.id AND m.status=\'published\' ORDER BY ml.is_cover DESC,ml.sort_order ASC,m.id ASC LIMIT 1)';
}
function publicSpeciesVisibleSql(): string {
    return "EXISTS (SELECT 1 FROM directory_species_occurrences o
        JOIN directory_entries e ON e.id=o.entry_id AND e.status='published'
        WHERE o.species_id=s.id AND o.status='published')";
}
