# api/admin/directory/sources/index.php

**Статус:** подготовлено в патче v0.4a, на хостинге не установлено. PHP исполняется на хосте; здесь хранится текстовая копия.

```php
<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';
directoryRequireMethod('GET');
requireAdmin();
try {
    $pdo = getDatabaseConnection();
    $stmt = $pdo->query('SELECT id, title, source_kind, publisher, url, accessed_at, published_on, license_name, license_url, comment, created_at FROM directory_sources ORDER BY id DESC LIMIT 500');
    header('Cache-Control: no-store');
    successResponse(['sources' => $stmt->fetchAll()]);
} catch (Throwable $error) {
    error_log('[directory/sources/index] ' . $error->getMessage());
    errorResponse('Не удалось загрузить источники', 500);
}
```
