<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';
directoryRequireMethod('GET');
requireAdmin();
$speciesId = speciesId($_GET['species_id'] ?? null, 'species_id');
try {
    $pdo = getDatabaseConnection();
    $stmt = $pdo->prepare('SELECT o.id, o.species_id, o.entry_id, o.segment_id, o.source_id, o.evidence_level, o.notes, o.verified_at, o.status, e.title AS entry_title, s.title AS segment_title, src.title AS source_title FROM directory_species_occurrences o JOIN directory_entries e ON e.id=o.entry_id LEFT JOIN directory_segments s ON s.id=o.segment_id JOIN directory_sources src ON src.id=o.source_id WHERE o.species_id=:species ORDER BY o.id DESC LIMIT 500');
    $stmt->execute(['species'=>$speciesId]);
    header('Cache-Control: no-store');
    successResponse(['occurrences'=>$stmt->fetchAll()]);
} catch (Throwable $e) {
    error_log('[directory/occurrences/index] ' . $e->getMessage());
    errorResponse('Не удалось загрузить связи вида', 500);
}
