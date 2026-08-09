# Admin Backend API Structure

Эта папка содержит структурированную документацию admin PHP API проекта Native Places.

Admin API работает отдельно от пользовательского API и использует отдельную session-структуру:

```php
$_SESSION['admin_user']
```

## Источники

Основные исходные Markdown-файлы:

```text
admin/docs/native_places_admin_api_files.md
admin/docs/dphp_corrected_code_archive.md
admin/docs/api_php_review_log.md
```

## Базовая структура

```text
docs/backend/admin/
  00_STRUCTURE.md

  shared/
    require-admin.php.md

  auth/
    login-admin.php.md
    login-code.php.md
    me.php.md
    logout.php.md

  settings/
    index.php.md
    update.php.md

  mailings/
    options.php.md
    preview.php.md
    index.php.md
    send.php.md
    start.php.md
    process.php.md
    delete.php.md

  plans/
    create.php.md
    index.php.md
    update.php.md
    paid-test-tariff.md

  dictionaries/
    index.php.md
    create-group.php.md
    update-group.php.md
    create-value.php.md
    update-value.php.md
    delete-value.php.md
```

## Реальные PHP paths

Реальные backend-файлы находятся в структуре:

```text
api/admin/
```

Примеры соответствия:

| PHP endpoint | Документация |
|---|---|
| `api/admin/shared/require-admin.php` | `docs/backend/admin/shared/require-admin.php.md` |
| `api/admin/auth/login-admin.php` | `docs/backend/admin/auth/login-admin.php.md` |
| `api/admin/auth/login-code.php` | `docs/backend/admin/auth/login-code.php.md` |
| `api/admin/auth/me.php` | `docs/backend/admin/auth/me.php.md` |
| `api/admin/auth/logout.php` | `docs/backend/admin/auth/logout.php.md` |
| `api/admin/settings/index.php` | `docs/backend/admin/settings/index.php.md` |
| `api/admin/settings/update.php` | `docs/backend/admin/settings/update.php.md` |
| `api/admin/mailings/options.php` | `docs/backend/admin/mailings/options.php.md` |
| `api/admin/mailings/preview.php` | `docs/backend/admin/mailings/preview.php.md` |
| `api/admin/mailings/index.php` | `docs/backend/admin/mailings/index.php.md` |
| `api/admin/mailings/send.php` | `docs/backend/admin/mailings/send.php.md` |
| `api/admin/mailings/start.php` | `docs/backend/admin/mailings/start.php.md` |
| `api/admin/mailings/process.php` | `docs/backend/admin/mailings/process.php.md` |
| `api/admin/mailings/delete.php` | `docs/backend/admin/mailings/delete.php.md` |
| `api/admin/plans/index.php` | `docs/backend/admin/plans/index.php.md` |
| `api/admin/plans/create.php` | `docs/backend/admin/plans/create.php.md` |
| `api/admin/plans/update.php` | `docs/backend/admin/plans/update.php.md` |
| тестовый платный тариф | `docs/backend/admin/plans/paid-test-tariff.md` |
| `api/admin/dictionaries/index.php` | `docs/backend/admin/dictionaries/index.php.md` |
| `api/admin/dictionaries/create-group.php` | `docs/backend/admin/dictionaries/create-group.php.md` |
| `api/admin/dictionaries/update-group.php` | `docs/backend/admin/dictionaries/update-group.php.md` |
| `api/admin/dictionaries/create-value.php` | `docs/backend/admin/dictionaries/create-value.php.md` |
| `api/admin/dictionaries/update-value.php` | `docs/backend/admin/dictionaries/update-value.php.md` |
| `api/admin/dictionaries/delete-value.php` | `docs/backend/admin/dictionaries/delete-value.php.md` |

## Admin session

Admin API использует отдельную сессию:

```php
$_SESSION['admin_user']
```

Обычная пользовательская сессия:

```php
$_SESSION['user_id']
```

не считается admin-авторизацией.

## Роли

В admin API используются роли:

| Роль | Описание |
|---|---|
| `admin` | Полный доступ к admin API. |
| `moderator` | Ограниченный доступ к admin API. |

## Helper-функции

Основной helper:

```php
api/admin/shared/require-admin.php
```

Он предоставляет функции:

```php
getCurrentAdminUser()
requireAdmin()
requireAdminOrModerator()
```

## Типы доступа

| Helper | Кто проходит |
|---|---|
| `requireAdmin()` | Только `admin`. |
| `requireAdminOrModerator()` | `admin` и `moderator`. |

## Стандарт endpoint-документа

Каждый admin endpoint описывается по шаблону:

```md
# api/admin/path/file.php

## Статус

## Назначение

## Метод и URL

## Авторизация

## Request

## Success response

## Error responses

## Frontend notes

## Backend notes

## PHP-код

## История изменений
```

## Статусы

В каждом файле используется таблица:

```md
## Статус

| Поле | Значение |
|---|---|
| Backend на хосте | да |
| Код сверено с хостом | да |
| Источник | `admin/docs/...` |
| Подключено на фронте | уточнить |
| Нужны правки backend | нет |
| Нужны правки frontend | уточнить |
```

## Важное правило

Если в Markdown-источниках нет полного PHP-кода endpoint-а, файл не заполняется выдуманным кодом.

В таком случае нужно либо:

1. найти код в другом источнике;
2. взять код с хоста;
3. временно сделать stub-документ со статусом `код не найден`.

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Добавлена структура admin backend docs. |