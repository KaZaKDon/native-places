# api/config/database.php

## Статус

| Поле | Значение |
|---|---|
| Backend на хосте | да |
| Код сверено с хостом | частично |
| Источник | `docs/API_FULL_TEXT.md` |
| Подключено на фронте | не используется напрямую |
| Нужны правки backend | нет |
| Нужны правки frontend | нет |

## Назначение

Файл создаёт PDO-подключение к MySQL/MariaDB.

Основная функция:

```php
getDatabaseConnection(): PDO
```

Она используется во всех endpoint-ах, которым нужна база данных.

## Важно

В исходном Markdown-экспорте пароль базы был обрезан/не указан:

```php
$pass =;
```

Поэтому этот документ описывает структуру подключения, но не должен использоваться как источник production credentials.

Реальный пароль должен храниться только на хосте.

## Подключение

DSN собирается в формате:

```php
mysql:host={$host};dbname={$dbName};charset=utf8mb4
```

## PDO-настройки

```php
PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
PDO::ATTR_EMULATE_PREPARES => false
```

## Что это значит

| Настройка | Значение |
|---|---|
| `PDO::ATTR_ERRMODE` | Ошибки PDO выбрасываются как исключения. |
| `PDO::ATTR_DEFAULT_FETCH_MODE` | Результаты возвращаются ассоциативными массивами. |
| `PDO::ATTR_EMULATE_PREPARES` | Отключены эмулированные prepared statements. |

## Frontend notes

Frontend не работает с этим файлом напрямую.

Если backend не может подключиться к базе, endpoint-ы обычно возвращают ошибку `500`.

## Backend notes

- Используется `charset=utf8mb4`.
- Реальные credentials не должны попадать в публичную документацию.
- Для production лучше хранить доступы в переменных окружения или закрытом конфиге хоста.
- Файл находится по backend-пути:
  - `api/config/database.php`.
- В документации файл лежит в `docs/backend/shared/database.php.md` для удобства, но реальный backend-путь — `api/config/database.php`.

## PHP-код из Markdown-экспорта

```php
<?php

function getDatabaseConnection(): PDO
{
    $host = 'localhost';
    $dbName = 'vnuko1796_nativeplaces_dev';
    $user = 'vnuko1796_nativeplaces_user';
    $pass =;

    $dsn = "mysql:host={$host};dbname={$dbName};charset=utf8mb4";

    return new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Документ структурирован из `docs/API_FULL_TEXT.md`; отмечено, что пароль БД в Markdown-экспорте обрезан. |