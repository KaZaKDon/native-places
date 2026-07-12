# api/admin/shared/require-admin.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Shared |
| Тип | PHP helper / auth guard |
| Авторизация | Проверяет admin session |
| Используется в | Admin endpoints |
| Источник | Код с хоста `api/admin/shared/require-admin.php` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Содержит функции для проверки административной авторизации.

Файл работает с PHP-сессией и объектом:

```php
$_SESSION['admin_user']
```

Основные функции:

- `getCurrentAdminUser()`;
- `requireAdmin()`;
- `requireAdminOrModerator()`.

## Подключения

```php
require_once __DIR__ . '/../../shared/response.php';
require_once __DIR__ . '/../../config/database.php';
```

Файл подключает:

- общий формат ответов;
- подключение к базе данных.

Хотя в текущем коде `require-admin.php` напрямую не использует базу, `database.php` подключён и становится доступен endpoint-ам, которые подключают этот helper.

## Функции

---

## getCurrentAdminUser()

```php
function getCurrentAdminUser(): ?array
```

### Назначение

Возвращает текущего пользователя админки из PHP-сессии.

Если сессия ещё не запущена, запускает её:

```php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
```

### Возвращает

| Условие | Результат |
|---|---|
| `$_SESSION['admin_user']` отсутствует | `null` |
| `$_SESSION['admin_user']` не массив | `null` |
| Сессия есть | массив пользователя |

### Пример успешного значения

```php
[
    'id' => 1,
    'email' => 'admin@example.com',
    'name' => 'Admin User',
    'role_code' => 'admin',
    'role_title' => 'Администратор',
    'access_type' => 'account',
]
```

---

## requireAdmin()

```php
function requireAdmin(): array
```

### Назначение

Требует авторизацию именно администратора.

Проверяет:

1. Есть ли текущий admin user в сессии.
2. Равен ли `role_code` значению `admin`.

### Если пользователь не авторизован

```json
{
  "success": false,
  "message": "Требуется авторизация администратора"
}
```

HTTP status:

```txt
401
```

### Если роль не admin

```json
{
  "success": false,
  "message": "Недостаточно прав администратора"
}
```

HTTP status:

```txt
403
```

### Если всё хорошо

Возвращает массив пользователя из сессии.

---

## requireAdminOrModerator()

```php
function requireAdminOrModerator(): array
```

### Назначение

Требует авторизацию администратора или модератора.

Проверяет:

1. Есть ли текущий admin user в сессии.
2. Входит ли `role_code` в список:
   ```php
   ['admin', 'moderator']
   ```

### Если пользователь не авторизован

```json
{
  "success": false,
  "message": "Требуется авторизация администратора или модератора"
}
```

HTTP status:

```txt
401
```

### Если роль не подходит

```json
{
  "success": false,
  "message": "Недостаточно прав"
}
```

HTTP status:

```txt
403
```

### Если всё хорошо

Возвращает массив пользователя из сессии.

## Использование

### Endpoint только для администратора

```php
require_once __DIR__ . '/../shared/require-admin.php';

$adminUser = requireAdmin();
```

### Endpoint для администратора и модератора

```php
require_once __DIR__ . '/../shared/require-admin.php';

$adminUser = requireAdminOrModerator();
```

## Frontend notes

- Этот файл напрямую frontend-ом не вызывается.
- Если frontend получает 401, нужно отправить пользователя на экран входа в админку.
- Если frontend получает 403, нужно показать сообщение о недостаточных правах.
- `requireAdmin()` используется для разделов, доступных только администратору.
- `requireAdminOrModerator()` используется для разделов модерации.

## Backend notes

- Файл сам запускает сессию через `getCurrentAdminUser()`.
- Проверка основана только на данных в `$_SESSION['admin_user']`.
- В этом helper-е нет перепроверки пользователя в базе данных.
- Если роль пользователя изменилась в базе, но сессия старая, доступ будет зависеть от старых данных в сессии до её обновления.
- `errorResponse()` должен завершать выполнение скрипта, иначе после ошибки код может продолжить работу.

## PHP-код

```php
<?php

require_once __DIR__ . '/../../shared/response.php';
require_once __DIR__ . '/../../config/database.php';

function getCurrentAdminUser(): ?array
{
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    if (empty($_SESSION['admin_user']) || !is_array($_SESSION['admin_user'])) {
        return null;
    }

    return $_SESSION['admin_user'];
}

function requireAdmin(): array
{
    $adminUser = getCurrentAdminUser();

    if (!$adminUser) {
        errorResponse('Требуется авторизация администратора', 401);
    }

    if (($adminUser['role_code'] ?? '') !== 'admin') {
        errorResponse('Недостаточно прав администратора', 403);
    }

    return $adminUser;
}

function requireAdminOrModerator(): array
{
    $adminUser = getCurrentAdminUser();

    if (!$adminUser) {
        errorResponse('Требуется авторизация администратора или модератора', 401);
    }

    $roleCode = $adminUser['role_code'] ?? '';

    if (!in_array($roleCode, ['admin', 'moderator'], true)) {
        errorResponse('Недостаточно прав', 403);
    }

    return $adminUser;
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-05 | Файл сверён с кодом хоста и оформлен в структуре `docs/backend/admin/shared`. |