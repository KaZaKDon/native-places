# api/admin/auth/me.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Auth |
| Тип | PHP endpoint |
| Авторизация | Через PHP session |
| Сессия | Читает `$_SESSION['admin_user']` |
| Источник | Код с хоста `api/admin/auth/me.php` |
| Готовность | Актуализировано по коду с хоста |

## Назначение

Проверяет текущую административную сессию.

Endpoint возвращает:

- `authenticated: false`, если сессии нет;
- `authenticated: true`, если в сессии есть `admin_user`.

## Метод и URL

```http
GET /api/admin/auth/me.php
```

## Success response

### Если сессия есть

```json
{
  "success": true,
  "authenticated": true,
  "user": {
    "id": 1,
    "email": "admin@example.com",
    "name": "Admin User",
    "role_code": "admin",
    "role_title": "Администратор",
    "access_type": "account"
  }
}
```

### Если сессии нет

```json
{
  "success": true,
  "authenticated": false,
  "user": null
}
```

## Frontend notes

- Используется при запуске админки.
- Если `authenticated = false`, нужно показать экран входа.
- Если `authenticated = true`, можно открыть административный интерфейс.
- Endpoint не перепроверяет пользователя в базе.

## Backend notes

- Использует `session_start()`.
- Проверяет только наличие `$_SESSION['admin_user']`.
- Не делает запрос к базе данных.
- Не проверяет актуальность роли в БД.
- Не пишет moderator-log.

## PHP-код

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../../shared/response.php';

session_start();

$adminUser = $_SESSION['admin_user'] ?? null;

if (!$adminUser) {
    successResponse([
        'authenticated' => false,
        'user' => null,
    ]);
}

successResponse([
    'authenticated' => true,
    'user' => $adminUser,
]);
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-05 | Файл актуализирован по коду с хоста. |