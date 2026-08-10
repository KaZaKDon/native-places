# api/config/env.php

## Статус

| Поле | Значение |
|---|---|
| Целевая версия backend | да |
| Полный PHP-код | да |
| Дата подготовки | 2026-08-09 |
| Путь на хосте | `/www/native-places.ru/api/config/env.php` |
| Секреты в документе | нет |

## Назначение

Загружает закрытые переменные из /www/native-places.env, расположенного вне web-root.

## Изменения этой версии

- Новый модуль исключает секреты из Git, Markdown и PHP-кода.

## Проверка после загрузки

1. Выполнить `php -l /www/native-places.ru/api/config/env.php` или проверить синтаксис в панели хостинга.
2. Выполнить связанный пользовательский сценарий по инструкции из архива.
3. Не добавлять реальные пароли и персональные данные в этот документ.

## PHP-код

```php
<?php

/**
 * Загружает закрытые настройки Native Places из файла вне web-root.
 *
 * Путь по умолчанию на текущем хосте:
 * /www/native-places.env
 *
 * При необходимости путь можно переопределить серверной переменной
 * NATIVE_PLACES_ENV_FILE.
 */
function loadNativePlacesEnvironment(): void
{
    static $loaded = false;

    if ($loaded) {
        return;
    }

    $loaded = true;

    $configuredPath = getenv('NATIVE_PLACES_ENV_FILE');
    $environmentPath = is_string($configuredPath) && trim($configuredPath) !== ''
        ? trim($configuredPath)
        : dirname(__DIR__, 3) . '/native-places.env';

    if (!is_file($environmentPath) || !is_readable($environmentPath)) {
        return;
    }

    $lines = file($environmentPath, FILE_IGNORE_NEW_LINES);

    if ($lines === false) {
        throw new RuntimeException('Не удалось прочитать файл окружения Native Places');
    }

    foreach ($lines as $lineNumber => $line) {
        $line = trim($line);

        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }

        if (str_starts_with($line, 'export ')) {
            $line = trim(substr($line, 7));
        }

        $separatorPosition = strpos($line, '=');

        if ($separatorPosition === false) {
            throw new RuntimeException(
                'Некорректная строка файла окружения: ' . ($lineNumber + 1)
            );
        }

        $name = trim(substr($line, 0, $separatorPosition));
        $value = trim(substr($line, $separatorPosition + 1));

        if (!preg_match('/^[A-Z][A-Z0-9_]*$/', $name)) {
            throw new RuntimeException(
                'Некорректное имя переменной окружения в строке: ' . ($lineNumber + 1)
            );
        }

        if (strlen($value) >= 2) {
            $firstCharacter = $value[0];
            $lastCharacter = $value[strlen($value) - 1];

            if (
                ($firstCharacter === '"' && $lastCharacter === '"')
                || ($firstCharacter === "'" && $lastCharacter === "'")
            ) {
                $value = substr($value, 1, -1);

                if ($firstCharacter === '"') {
                    $value = stripcslashes($value);
                }
            }
        }

        if (getenv($name) !== false) {
            continue;
        }

        putenv($name . '=' . $value);
        $_ENV[$name] = $value;
    }
}

function envString(string $name, ?string $default = null): ?string
{
    loadNativePlacesEnvironment();

    $value = getenv($name);

    if ($value === false || trim((string) $value) === '') {
        return $default;
    }

    return (string) $value;
}

function envRequired(string $name): string
{
    $value = envString($name);

    if ($value === null) {
        throw new RuntimeException('Не заполнена обязательная настройка: ' . $name);
    }

    return $value;
}

function envInt(string $name, int $default): int
{
    $value = envString($name);

    if ($value === null) {
        return $default;
    }

    if (filter_var($value, FILTER_VALIDATE_INT) === false) {
        throw new RuntimeException('Настройка должна быть целым числом: ' . $name);
    }

    return (int) $value;
}

function envBool(string $name, bool $default): bool
{
    $value = envString($name);

    if ($value === null) {
        return $default;
    }

    $normalizedValue = strtolower(trim($value));

    if (in_array($normalizedValue, ['1', 'true', 'yes', 'on'], true)) {
        return true;
    }

    if (in_array($normalizedValue, ['0', 'false', 'no', 'off'], true)) {
        return false;
    }

    throw new RuntimeException('Настройка должна быть логическим значением: ' . $name);
}

```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-08-09 | Подготовлена исправленная полная версия по результатам сверки frontend, backend и структуры БД. |
