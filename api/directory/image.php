<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';
directoryPublicGetOnly();
$id = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT, ['options'=>['min_range'=>1]]);
if (!$id) errorResponse('Некорректный идентификатор изображения', 422);
try {
    $pdo = getDatabaseConnection();
    $stmt = $pdo->prepare("SELECT m.mime,m.image_data FROM directory_media m
        JOIN directory_media_links l ON l.media_id=m.id
        JOIN directory_species s ON s.id=l.species_id AND s.status='published' AND s.kind='fish'
        WHERE m.id=:id AND m.status='published' AND EXISTS (
            SELECT 1 FROM directory_species_occurrences o
            JOIN directory_entries e ON e.id=o.entry_id AND e.status='published'
            WHERE o.species_id=s.id AND o.status='published'
        ) LIMIT 1");
    $stmt->execute(['id'=>$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row || !in_array($row['mime'], ['image/webp','image/jpeg','image/png'], true)) {
        errorResponse('Изображение не найдено', 404);
    }
    header('Content-Type: '.$row['mime']);
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    header("Content-Security-Policy: default-src 'none'; sandbox");
    echo $row['image_data'];
    exit;
} catch (Throwable $e) {
    error_log('[directory/image] '.$e->getMessage());
    errorResponse('Изображение временно недоступно', 503);
}
