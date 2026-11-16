# api/directory/_bootstrap.php

**Статус:** исходник v0.3; на хостинге не установлен и не проверен (15.11.2026).

```php
<?php
declare(strict_types=1);
require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

function directoryPublicGetOnly(): void {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
        header('Allow: GET');
        errorResponse('Метод не поддерживается', 405);
    }
    // Public entries can be unpublished at any time; do not cache stale JSON.
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
}
function directoryPublicType(string $type): bool {
    return in_array($type, ['river', 'lake', 'forest', 'natural_area', 'hunting_ground', 'landmark', 'spring'], true);
}
function directoryPublicGeometry(?string $json): ?array {
    if (!$json) return null;
    $geometry = json_decode($json, true);
    return is_array($geometry) && isset($geometry['type'], $geometry['coordinates']) ? $geometry : null;
}
```
