# api/admin/directory/segments/index.php

**Статус:** подготовлено в патче v0.4a, на хостинге не установлено. PHP исполняется на хосте; здесь хранится текстовая копия.

```php
<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';
directoryRequireMethod('GET');
requireAdmin();
$riverId = null;
if (isset($_GET['river_entry_id']) && $_GET['river_entry_id'] !== '') {
    $riverId = segmentsPositiveId($_GET['river_entry_id'], 'river_entry_id');
}
try {
    $pdo = getDatabaseConnection();
    // No public listing in v0.4a. Return only the requested river's items.
    if ($riverId === null) errorResponse('Выберите реку', 422);
    $stmt = $pdo->prepare('SELECT s.id, s.river_entry_id, s.slug, s.title, s.sort_order, s.locality, s.summary, s.body, s.geometry_geojson, s.geometry_source_id, s.status, s.created_at, s.updated_at, s.published_at, src.title AS geometry_source_title FROM directory_segments s LEFT JOIN directory_sources src ON src.id = s.geometry_source_id WHERE s.river_entry_id = :river_id ORDER BY s.sort_order ASC, s.id ASC LIMIT 500');
    $stmt->execute(['river_id' => $riverId]);
    successResponse(['segments' => $stmt->fetchAll()]);
} catch (Throwable $error) {
    error_log('[directory/segments/index] ' . $error->getMessage());
    errorResponse('Не удалось загрузить участки реки', 500);
}
```
