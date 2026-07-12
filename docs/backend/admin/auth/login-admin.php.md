# api/admin/auth/login-admin.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Auth |
| Тип | PHP endpoint |
| Авторизация | Не требуется |
| Сессия | Создаёт `$_SESSION['admin_user']` |
| Источник | Код с хоста `api/admin/auth/login-admin.php` |
| Готовность | Актуализировано по коду с хоста |

## Назначение

Выполняет вход в админку по email и паролю администратора.

Endpoint проверяет:

- наличие email;
- корректность email;
- наличие пароля;
- существование пользователя;
- активный статус пользователя;
- корректность пароля;
- роль `admin`.

После успешной проверки создаёт административную сессию.

## Метод и URL

```http
POST /api/admin/auth/login-admin.php
```

## Авторизация

Не требуется.

Это endpoint входа в админку.

## Request

```json
{
  "email": "admin@example.com",
  "password": "password"
}
```

## Success response

```json
{
  "success": true,
  "message": "Вход в админку выполнен",
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

## Error responses

### 422 — ошибка валидации

```json
{
  "success": false,
  "message": "Ошибка валидации",
  "errors": {
    "email": "Введите email",
    "password": "Введите пароль"
  }
}
```

Возможные ошибки:

| Поле | Сообщение |
|---|---|
| `email` | `Введите email` |
| `email` | `Некорректный email` |
| `password` | `Введите пароль` |

### 401 — неверный email или пароль

```json
{
  "success": false,
  "message": "Неверный email или пароль"
}
```

### 403 — пользователь заблокирован или удалён

```json
{
  "success": false,
  "message": "Пользователь заблокирован или удалён"
}
```

### 403 — недостаточно прав

```json
{
  "success": false,
  "message": "Недостаточно прав для входа в админку"
}
```

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось выполнить вход в админку",
  "error": "..."
}
```

## Frontend notes

- Используется для входа администратора по email и паролю.
- После успешного ответа frontend должен сохранить состояние авторизации.
- Для проверки сессии после перезагрузки использовать `me.php`.
- `access_type = account` означает вход через аккаунт администратора.

## Backend notes

- Использует `session_regenerate_id(true)` после успешной проверки.
- Это защищает от session fixation.
- В сессию сохраняется `admin_user`.
- Пароль проверяется через `password_verify`.
- Вход разрешён только пользователю с `role_code = admin`.
- Данные роли подтягиваются из таблицы `roles`.

## PHP-код

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../../shared/response.php';
require_once __DIR__ . '/../../config/database.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$input = json_decode(
    file_get_contents('php://input'),
    true
);

if (!is_array($input)) {
    $input = [];
}

$email = trim($input['email'] ?? '');
$password = trim($input['password'] ?? '');

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

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            u.id,
            u.role_id,
            u.email,
            u.password_hash,
            u.first_name,
            u.last_name,
            u.status,
            r.code AS role_code,
            r.title AS role_title
        FROM users u
        INNER JOIN roles r
            ON r.id = u.role_id
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

    if ($user['status'] !== 'active') {
        errorResponse('Пользователь заблокирован или удалён', 403);
    }

    if (!password_verify($password, $user['password_hash'])) {
        errorResponse('Неверный email или пароль', 401);
    }

    if ($user['role_code'] !== 'admin') {
        errorResponse('Недостаточно прав для входа в админку', 403);
    }

    session_regenerate_id(true);

    $_SESSION['admin_user'] = [
        'id' => (int) $user['id'],
        'email' => $user['email'],
        'name' => trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? '')),
        'role_code' => $user['role_code'],
        'role_title' => $user['role_title'],
        'access_type' => 'account',
    ];

    successResponse([
        'message' => 'Вход в админку выполнен',
        'authenticated' => true,
        'user' => $_SESSION['admin_user'],
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось выполнить вход в админку', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-05 | Файл актуализирован по коду с хоста. |