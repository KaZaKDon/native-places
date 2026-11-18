# api/admin/directory/occurrences/_bootstrap.php

**Статус:** код подготовлен для хостинга в v0.4b; не развёрнут. Локально только текстовая копия PHP.

```php
<?php
declare(strict_types=1);
require_once __DIR__ . '/../species/_bootstrap.php';

function occurrenceDate(array $input): string {
    $date = directoryString($input, 'verified_at', 10);
    $parsed = DateTimeImmutable::createFromFormat('!Y-m-d', $date);
    if (!$parsed || $parsed->format('Y-m-d') !== $date || $date > gmdate('Y-m-d')) {
        errorResponse('Укажите действительную дату проверки', 422);
    }
    return $date;
}

```
