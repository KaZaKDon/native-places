# api/admin/directory/index.php

**Статус:** размещено на хостинге пользователем 15.11.2026, работа подтверждена (v0.1).
**Версия:** v0.1 от 15.11.2026.

```php
<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';
directoryRequireMethod('GET');
requireAdmin();
try {
    $pdo = getDatabaseConnection();
    $stmt = $pdo->query('SELECT id, slug, type, title, region, summary, body, source_url, geometry_geojson, status, created_at, updated_at FROM directory_entries ORDER BY updated_at DESC, id DESC LIMIT 500');
    successResponse(['entries' => $stmt->fetchAll(), 'csrf_token' => directoryCsrfToken()]);
} catch (Throwable $error) {
    error_log('Directory index: ' . $error->getMessage());
    errorResponse('Не удалось загрузить справочник мест', 500);
}

```
