# api/auth/logout.php

## Статус

| Поле | Значение |
|---|---|
| Backend на хосте | да |
| Код сверено с хостом | да |
| Источник | `docs/API_FULL_TEXT.md` |
| Подключено на фронте | уточнить |
| Нужны правки backend | нет |
| Нужны правки frontend | уточнить |

## Назначение

Endpoint завершает пользовательскую сессию.

Очищает `$_SESSION`, удаляет session cookie и вызывает `session_destroy()`.

## Метод и URL

```http
POST /api/auth/logout.php
```

## Авторизация

Формально можно вызвать без авторизации.

Если сессия есть, она будет очищена.

## Request

Тело запроса не требуется.

## Success response

HTTP `200`

```json
{
  "success": true,
  "data": {
    "message": "Выход выполнен успешно",
    "authenticated": false,
    "user": null
  }
}
```

## Error responses

Ожидаемых бизнес-ошибок нет.

## Frontend notes

- Endpoint используется для кнопки «Выйти».
- После успешного ответа нужно очистить auth store на фронте.
- После logout можно перенаправить пользователя на главную или страницу входа.
- Для корректного удаления cookie frontend должен отправлять запрос с credentials.

## Backend notes

- Вызывается `session_start()`.
- Затем:
  - `$_SESSION = []`;
  - удаляется session cookie;
  - вызывается `session_destroy()`.
- Возвращается `authenticated = false`.

## PHP-код

```php
<?php
require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';

session_start();

$_SESSION = [];

if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();

    setcookie(
        session_name(),
        '',
        time() - 42000,
        $params['path'],
        $params['domain'],
        $params['secure'],
        $params['httponly']
    );
}

session_destroy();

successResponse([
    'message' => 'Выход выполнен успешно',
    'authenticated' => false,
    'user' => null,
]);
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Документ структурирован из `docs/API_FULL_TEXT.md`. |