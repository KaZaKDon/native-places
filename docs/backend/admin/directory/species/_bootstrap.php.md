# api/admin/directory/species/_bootstrap.php

**Статус:** код подготовлен для хостинга в v0.4b; не развёрнут. Локально только текстовая копия PHP.

```php
<?php
declare(strict_types=1);
require_once __DIR__ . '/../_bootstrap.php';

function speciesInput(): array {
    $payload = json_decode((string) file_get_contents('php://input'));
    if (!($payload instanceof stdClass)) errorResponse('Ожидается JSON-объект', 422);
    return (array) $payload;
}

function speciesId(mixed $value, string $field, bool $optional = false): ?int {
    if ($optional && ($value === null || $value === '' || $value === 0)) return null;
    $id = filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if ($id === false) errorResponse('Некорректный ID: ' . $field, 422);
    return (int) $id;
}

function speciesSlug(array $payload): string {
    $slug = directoryString($payload, 'slug', 160);
    if (!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/D', $slug)) errorResponse('Некорректный slug вида', 422);
    return $slug;
}

```
