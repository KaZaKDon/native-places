# api/admin/directory/sources/_bootstrap.php

**Статус:** подготовлено в патче v0.4a, на хостинге не установлено. PHP исполняется на хосте; здесь хранится текстовая копия.

```php
<?php
declare(strict_types=1);
require_once __DIR__ . '/../_bootstrap.php';

function sourcesInput(): array {
    $input = json_decode((string) file_get_contents('php://input'), true);
    if (!is_array($input) || array_is_list($input)) errorResponse('Ожидается JSON-объект', 422);
    return $input;
}

function sourcesDate(array $input, string $field, bool $required): ?string {
    $raw = directoryString($input, $field, 10);
    if ($raw === '' && !$required) return null;
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $raw);
    if (!$date || $date->format('Y-m-d') !== $raw) errorResponse('Некорректная дата: ' . $field, 422);
    return $raw;
}

function sourcesUrl(array $input, string $field, bool $required): string {
    $raw = directoryString($input, $field, 1000);
    if ($raw === '' && !$required) return '';
    if (!filter_var($raw, FILTER_VALIDATE_URL) || !in_array(strtolower((string)parse_url($raw, PHP_URL_SCHEME)), ['https','http'], true)) {
        errorResponse('Некорректная HTTP(S)-ссылка: ' . $field, 422);
    }
    return $raw;
}
```
