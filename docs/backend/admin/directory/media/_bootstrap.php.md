# api/admin/directory/media/_bootstrap.php

**Статус:** код подготовлен для хостинга в v0.4b; не развёрнут. Локально только текстовая копия PHP.

```php
<?php
declare(strict_types=1);
require_once __DIR__ . '/../species/_bootstrap.php';

function mediaHttpUrl(string $value, string $field, bool $optional = true): string {
    $value = trim($value);
    if ($value === '' && $optional) return '';
    if (strlen($value) > 1000 || !filter_var($value, FILTER_VALIDATE_URL) || !in_array(strtolower((string) parse_url($value, PHP_URL_SCHEME)), ['https','http'], true)) {
        errorResponse('Некорректная ссылка: ' . $field, 422);
    }
    return $value;
}

```
