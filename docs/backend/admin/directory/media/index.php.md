# api/admin/directory/media/index.php

**Статус:** код подготовлен для хостинга в v0.4b; не развёрнут. Локально только текстовая копия PHP.

```php
<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';
directoryRequireMethod('GET');
requireAdmin();
$speciesId = speciesId($_GET['species_id'] ?? null, 'species_id');
try {
    $pdo = getDatabaseConnection();
    $stmt = $pdo->prepare('SELECT m.id,m.mime,m.width,m.height,m.size_bytes,m.caption,m.alt_text,m.author,m.license_name,m.license_url,m.source_url,m.attribution,m.status,m.created_at,l.is_cover,l.sort_order FROM directory_media_links l JOIN directory_media m ON m.id=l.media_id WHERE l.species_id=:species ORDER BY l.is_cover DESC,l.sort_order ASC,m.id ASC LIMIT 100');
    $stmt->execute(['species'=>$speciesId]);
    header('Cache-Control: no-store');
    successResponse(['media'=>$stmt->fetchAll()]);
} catch (Throwable $e) {
    error_log('[directory/media/index] ' . $e->getMessage());
    errorResponse('Не удалось загрузить фотографии', 500);
}

```
