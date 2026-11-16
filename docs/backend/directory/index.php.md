# api/directory/index.php

**Статус:** исходник v0.3; на хостинге не установлен и не проверен (15.11.2026).

```php
<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';
directoryPublicGetOnly();
$type = trim((string) ($_GET['type'] ?? ''));
if ($type !== '' && !directoryPublicType($type)) errorResponse('Неизвестный тип объекта', 422);
$page = filter_var($_GET['page'] ?? 1, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 1000]]);
if (!$page) errorResponse('Некорректный номер страницы', 422);
$limit = 24;
$offset = ($page - 1) * $limit;
try {
    $pdo = getDatabaseConnection();
    $where = "status = 'published'" . ($type !== '' ? ' AND type = :type' : '');
    $sql = "SELECT id, slug, type, title, region, summary, source_url, published_at, updated_at FROM directory_entries WHERE $where ORDER BY published_at DESC, id DESC LIMIT " . ($limit + 1) . ' OFFSET ' . $offset;
    $stmt = $pdo->prepare($sql);
    $stmt->execute($type !== '' ? ['type' => $type] : []);
    $rows = $stmt->fetchAll();
    $hasMore = count($rows) > $limit;
    successResponse(['entries' => array_slice($rows, 0, $limit), 'page' => (int) $page, 'has_more' => $hasMore]);
} catch (Throwable $error) {
    error_log('[directory/index] ' . $error->getMessage());
    errorResponse('Справочник временно недоступен', 503);
}
```
