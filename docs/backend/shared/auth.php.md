# api/shared/auth.php

## Статус

| Поле | Значение |
|---|---|
| Backend на хосте | да |
| Код сверено с хостом | да |
| Источник | `docs/API_FULL_TEXT.md` |
| Подключено на фронте | косвенно через защищённые endpoint-ы |
| Нужны правки backend | нет |
| Нужны правки frontend | нет |

## Назначение

Файл содержит helper-функции пользовательской авторизации через PHP-сессию.

Основные функции:

```php
getCurrentUserId()
requireAuth()
```

## `getCurrentUserId()`

Возвращает ID текущего пользователя из сессии или `null`.

```php
getCurrentUserId(): ?int
```

Логика:

1. Если PHP-сессия ещё не запущена, вызывает `session_start()`.
2. Проверяет `$_SESSION['user_id']`.
3. Если `user_id` пустой — возвращает `null`.
4. Если есть — возвращает ID пользователя как `int`.

## `requireAuth()`

Требует авторизации пользователя.

```php
requireAuth(): int
```

Логика:

1. Вызывает `getCurrentUserId()`.
2. Если пользователя нет — возвращает ошибку:

```json
{
  "success": false,
  "message": "Требуется авторизация",
  "extra": {}
}
```

с HTTP-статусом `401`.

3. Если пользователь есть — возвращает его ID.

## Frontend notes

- Если защищённый endpoint вернул `401`, нужно считать пользователя неавторизованным.
- Для запросов к защищённым endpoint-ам frontend должен отправлять cookies.
- Для `fetch`:

```ts
fetch(url, {
  credentials: 'include'
});
```

- Для `axios`:

```ts
axios.create({
  withCredentials: true
});
```

## Backend notes

- Этот helper проверяет только наличие `user_id` в PHP-сессии.
- Он не проверяет статус пользователя в базе.
- Если endpoint-у важно убедиться, что пользователь активен, нужна дополнительная проверка в самом endpoint-е или расширение helper-а.
- Для админки используется другой механизм:
  - `api/admin/shared/require-admin.php`.

## PHP-код

```php
<?php

function getCurrentUserId(): ?int
{
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    if (empty($_SESSION['user_id'])) {
        return null;
    }

    return (int) $_SESSION['user_id'];
}

function requireAuth(): int
{
    $userId = getCurrentUserId();

    if (!$userId) {
        errorResponse('Требуется авторизация', 401);
    }

    return $userId;
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Документ структурирован из `docs/API_FULL_TEXT.md`. |