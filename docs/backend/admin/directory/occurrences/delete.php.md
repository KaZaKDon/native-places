# api/admin/directory/occurrences/delete.php

**Статус:** код подготовлен для хостинга в v0.4b; не развёрнут. Локально только текстовая копия PHP.

```php
<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';
directoryRequireMethod('POST');
requireAdmin();
$payload = speciesInput();
directoryAssertCsrf($payload);
$id = speciesId($payload['id'] ?? null, 'id');
$speciesId = speciesId($payload['species_id'] ?? null, 'species_id');
try {
    $pdo = getDatabaseConnection();
    $stmt = $pdo->prepare("DELETE FROM directory_species_occurrences WHERE id=:id AND species_id=:species AND status='draft'");
    $stmt->execute(['id'=>$id,'species'=>$speciesId]);
    if ($stmt->rowCount() !== 1) errorResponse('Черновик связи не найден', 404);
    header('Cache-Control: no-store');
    successResponse(['deleted'=>true]);
} catch (Throwable $e) {
    error_log('[directory/occurrences/delete] ' . $e->getMessage());
    errorResponse('Не удалось удалить черновик связи', 500);
}

```
