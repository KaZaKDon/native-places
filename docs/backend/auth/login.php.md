# api/auth/login.php

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

Endpoint авторизует пользователя по email и паролю.

При успешном входе backend сохраняет ID пользователя в PHP-сессии:

```php
$_SESSION['user_id']
```

## Метод и URL

```http
POST /api/auth/login.php
```

## Авторизация

Не требуется.

Endpoint сам создаёт пользовательскую сессию при успешной авторизации.

## Request

Тело запроса передаётся в формате JSON.

```json
{
  "email": "user@example.com",
  "password": "password"
}
```

## Request fields

| Поле | Тип | Обязательное | Правила |
|---|---|---:|---|
| `email` | string | да | Не пустой, валидный email. |
| `password` | string | да | Не пустой. |

## Success response

HTTP `200`

```json
{
  "success": true,
  "data": {
    "message": "Вход выполнен успешно",
    "authenticated": true,
    "user": {
      "id": 1,
      "role_id": 1,
      "email": "user@example.com",
      "first_name": "Иван",
      "last_name": null,
      "phone": "+79990000000",
      "telegram": "@username",
      "avatar": null,
      "status": "active",
      "role_code": "user",
      "role_title": "Пользователь"
    }
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `422` | `Ошибка валидации` | Ошибки заполнения формы. |
| `401` | `Неверный email или пароль` | Пользователь не найден или пароль не подошёл. |
| `403` | `Пользователь заблокирован или удалён` | Статус пользователя не `active`. |
| `500` | `Не удалось выполнить вход` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint используется для формы входа.
- Для работы PHP-сессии frontend должен отправлять cookies:
  - `credentials: 'include'` для `fetch`;
  - `withCredentials: true` для `axios`.
- После успешного входа можно сохранить пользователя в auth store.
- После входа можно дополнительно вызвать `api/auth/me.php`, если нужно восстановить единый формат текущей сессии.
- При `401` показать общую ошибку логина/пароля.
- При `403` показать сообщение о блокировке.

## Backend notes

- Используются таблицы:
  - `users`;
  - `roles`.
- Пароль проверяется через:
  - `password_verify()`.
- Если пользователь активен и пароль верный:
  - `$_SESSION['user_id'] = user.id`.
- `password_hash` удаляется из массива пользователя перед ответом.
Весь runtime-код endpoint-а должен быть внутри `try/catch`, включая `session_start()`, чтение JSON и приведение полей. Иначе TypeError/ошибка сессии до блока `try` может дать пустой HTTP 500 вместо JSON-ответа.

## PHP-код

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

try {
    session_start();

  $input = json_decode(
    file_get_contents('php://input'),
    true
  );

  if (!is_array($input)) {
    errorResponse('Некорректный JSON', 400);
  }

  $email = trim((string) ($input['email'] ?? ''));
  $password = trim((string) ($input['password'] ?? ''));

  $errors = [];

  if ($email === '') {
      $errors['email'] = 'Введите email';
  } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
      $errors['email'] = 'Некорректный email';
  }

  if ($password === '') {
      $errors['password'] = 'Введите пароль';
  }

  if (!empty($errors)) {
      errorResponse('Ошибка валидации', 422, [
          'errors' => $errors,
      ]);
  }


    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            u.id,
            u.role_id,
            u.email,
            u.password_hash,
            u.first_name,
            u.last_name,
            u.phone,
            u.telegram,
            u.avatar,
            u.status,
            u.email_verified_at,

            r.code AS role_code,
            r.title AS role_title

        FROM users u
        INNER JOIN roles r ON r.id = u.role_id

        WHERE u.email = :email
        LIMIT 1
    ");

    $stmt->execute([
        'email' => $email,
    ]);

    $user = $stmt->fetch();

    if (!$user) {
        errorResponse('Неверный email или пароль', 401);
    }

    if (!password_verify($password, $user['password_hash'])) {
        errorResponse('Неверный email или пароль', 401);
    }

    if ($user['status'] !== 'active') {
        errorResponse('Пользователь заблокирован или удалён', 403);
    }

    if (empty($user['email_verified_at'])) {
        errorResponse('Подтвердите email перед входом', 403, [
            'code' => 'email_not_verified',
            'email' => $user['email'],
            'can_resend' => true,
        ]);
    }

    session_regenerate_id(true);

    $_SESSION['user_id'] = (int) $user['id'];

    unset($user['password_hash']);

    successResponse([
        'message' => 'Вход выполнен успешно',
        'authenticated' => true,
        'user' => $user,
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось выполнить вход', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## Проверка после загрузки

### 1. Синтаксис PHP

```bash
php -l api/auth/login.php
```

### 2. Неподтверждённый пользователь

Если `users.email_verified_at = NULL`, при входе должен прийти ответ:

```json
{
  "success": false,
  "message": "Подтвердите email перед входом",
  "extra": {
    "code": "email_not_verified",
    "email": "user@example.com",
    "can_resend": true
  }
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Документ структурирован из `docs/API_FULL_TEXT.md`. |