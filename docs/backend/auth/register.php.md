# api/auth/register.php

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

Endpoint регистрирует нового пользователя.

Создаёт запись в таблице `users`, сохраняет пароль через `password_hash()` и возвращает данные созданного пользователя.

## Метод и URL

```http
POST /api/auth/register.php
```

## Авторизация

Не требуется.

Endpoint публичный.

## Request

Тело запроса передаётся в формате JSON.

```json
{
  "email": "user@example.com",
  "password": "password",
  "first_name": "Иван",
  "profile_status": "Путешественник",
  "phone": "+79990000000",
  "telegram": "@username"
}
```

## Request fields

| Поле | Тип | Обязательное | Правила |
|---|---|---:|---|
| `email` | string | да | Не пустой, валидный email, уникальный в `users`. |
| `password` | string | да | Не пустой, минимум 6 символов. |
| `first_name` | string | да | Не пустое имя. |
| `profile_status` | string | нет | Максимум 255 символов. |
| `phone` | string | нет | Сохраняется как строка или `null`. |
| `telegram` | string | нет | Сохраняется как строка или `null`. |

## Success response

HTTP `201`

```json
{
  "success": true,
  "data": {
    "message": "Пользователь успешно зарегистрирован",
    "user": {
      "id": 1,
      "role_id": 1,
      "email": "user@example.com",
      "first_name": "Иван",
      "profile_status": "Путешественник",
      "phone": "+79990000000",
      "telegram": "@username",
      "status": "active"
    }
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `422` | `Ошибка валидации` | Ошибки заполнения формы. |
| `409` | `Пользователь с таким email уже существует` | Email уже есть в таблице `users`. |
| `500` | `Не удалось выполнить регистрацию` | Неожиданная ошибка backend-а или базы данных. |

## Validation details

Пример ошибки:

```json
{
  "success": false,
  "message": "Ошибка валидации",
  "extra": {
    "errors": {
      "first_name": "Введите имя",
      "email": "Некорректный email",
      "password": "Пароль должен содержать минимум 6 символов",
      "profile_status": "Статус не должен быть длиннее 255 символов"
    }
  }
}
```

## Frontend notes

- Endpoint используется для формы регистрации.
- После успешной регистрации backend не делает автоматический login в этом коде.
- После регистрации frontend может:
  - показать сообщение об успехе;
  - отправить пользователя на страницу входа;
  - или отдельно вызвать `api/auth/login.php`.
- При `409` показать ошибку около поля email.
- При `422` привязать ошибки к полям формы.

## Backend notes

- Используются таблицы:
  - `users`.
- Перед созданием пользователя проверяется уникальность email.
- Пароль сохраняется через:
  - `password_hash($password, PASSWORD_DEFAULT)`.
- Новый пользователь получает:
  - `role_id = 1`;
  - `status = 'active'`.
- Пустые `profile_status`, `phone`, `telegram` сохраняются как `null`.

## PHP-код

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

$input = json_decode(
    file_get_contents('php://input'),
    true
);

$email = trim($input['email'] ?? '');
$password = trim($input['password'] ?? '');
$firstName = trim($input['first_name'] ?? '');
$profileStatus = trim($input['profile_status'] ?? '');
$phone = trim($input['phone'] ?? '');
$telegram = trim($input['telegram'] ?? '');

$errors = [];

if ($firstName === '') {
    $errors['first_name'] = 'Введите имя';
}

if ($email === '') {
    $errors['email'] = 'Введите email';
} elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'Некорректный email';
}

if ($password === '') {
    $errors['password'] = 'Введите пароль';
} elseif (mb_strlen($password) < 6) {
    $errors['password'] = 'Пароль должен содержать минимум 6 символов';
}

if (mb_strlen($profileStatus) > 255) {
    $errors['profile_status'] = 'Статус не должен быть длиннее 255 символов';
}

if (!empty($errors)) {
    errorResponse('Ошибка валидации', 422, [
        'errors' => $errors,
    ]);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT id
        FROM users
        WHERE email = :email
        LIMIT 1
    ");

    $stmt->execute([
        'email' => $email,
    ]);

    $existingUser = $stmt->fetch();

    if ($existingUser) {
        errorResponse('Пользователь с таким email уже существует', 409);
    }

    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    $insertStmt = $pdo->prepare("
        INSERT INTO users (
            role_id,
            email,
            password_hash,
            first_name,
            profile_status,
            phone,
            telegram,
            status
        ) VALUES (
            :role_id,
            :email,
            :password_hash,
            :first_name,
            :profile_status,
            :phone,
            :telegram,
            :status
        )
    ");

    $insertStmt->execute([
        'role_id' => 1,
        'email' => $email,
        'password_hash' => $passwordHash,
        'first_name' => $firstName,
        'profile_status' => $profileStatus !== '' ? $profileStatus : null,
        'phone' => $phone !== '' ? $phone : null,
        'telegram' => $telegram !== '' ? $telegram : null,
        'status' => 'active',
    ]);

    $userId = (int) $pdo->lastInsertId();

    successResponse([
        'message' => 'Пользователь успешно зарегистрирован',
        'user' => [
            'id' => $userId,
            'role_id' => 1,
            'email' => $email,
            'first_name' => $firstName,
            'profile_status' => $profileStatus !== '' ? $profileStatus : null,
            'phone' => $phone !== '' ? $phone : null,
            'telegram' => $telegram !== '' ? $telegram : null,
            'status' => 'active',
        ],
    ], 201);
} catch (Throwable $e) {
    errorResponse('Не удалось выполнить регистрацию', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Документ структурирован из `docs/API_FULL_TEXT.md`. |