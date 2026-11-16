# api/directory/show.php

**Статус:** исходник v0.3; на хостинге не установлен и не проверен (15.11.2026).

```php
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
    successResponse(['entry' => $entry]);
} catch (Throwable $error) {
    error_log('[directory/show] ' . $error->getMessage());
    errorResponse('Справочник временно недоступен', 503);
}
```
