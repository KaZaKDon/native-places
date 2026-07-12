# api/admin/auth/logout.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Auth |
| Тип | PHP endpoint |
| Авторизация | Через PHP session |
| Сессия | Удаляет `$_SESSION['admin_user']` |
| Источник | Код с хоста `api/admin/auth/logout.php` |
| Готовность | Актуализировано по коду с хоста |

## Назначение

Выполняет выход из админки.

Endpoint удаляет административного пользователя из сессии:

```php
unset($_SESSION['admin_user']);
```

## Метод и URL

```http
POST /api/admin/auth/logout.php
```

Технически в коде нет проверки HTTP-метода, но frontend лучше использовать `POST`.

## Success response

```json
{
  "success": true,
  "message": "Выход из админки выполнен",
  "authenticated": false,
  "user": null
}
```

## Frontend notes

- После успешного ответа нужно очистить состояние авторизации.
- Затем можно перенаправить пользователя на страницу входа.
- Endpoint не уничтожает всю сессию через `session_destroy()`, а удаляет только `admin_user`.

## Backend notes

- Использует `session_start()`.
- Удаляет `$_SESSION['admin_user']`.
- Не проверяет авторизацию.
- Не пишет moderator-log.

## PHP-код

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../../shared/response.php';

session_start();

unset($_SESSION['admin_user']);

successResponse([
    'message' => 'Выход из админки выполнен',
    'authenticated' => false,
    'user' => null,
]);
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-05 | Файл актуализирован по коду с хоста. |