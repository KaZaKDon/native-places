# api/profile/password.php

## Статус

| Поле | Значение |
|---|---|
| Backend на хосте | да |
| Код сверено с хостом | да |
| Источник | `php-after-changes/api-profile-password-updated.md` |
| Подключено на фронте | уточнить |
| Нужны правки backend | нет |
| Нужны правки frontend | уточнить |

## Назначение

Endpoint обновляет пароль текущего авторизованного пользователя.

Используется в настройках личного кабинета в блоке «Пароль». Пользователь вводит текущий пароль и новый пароль, backend проверяет текущий пароль через `password_verify()` и сохраняет новый `password_hash`.

## Метод и URL

```http
POST /api/profile/password.php
```

## Авторизация

Требуется user session.

Endpoint вызывает:

```php
$userId = requireAuth();
```

Если пользователь не авторизован, backend должен вернуть `401`.

## Request

Тело запроса передаётся в формате JSON.

```json
{
  "current_password": "old-password",
  "new_password": "new-password"
}
```

## Request fields

| Поле | Тип | Обязательное | Правила |
|---|---|---:|---|
| `current_password` | string | да | Не пустой текущий пароль пользователя. |
| `new_password` | string | да | Не пустой, минимум 6 символов. |

## Success response

HTTP `200`

```json
{
  "success": true,
  "data": {
    "message": "Пароль обновлён"
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `400` | `Некорректный JSON` | Тело запроса не является корректным JSON-объектом. |
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `404` | `Пользователь не найден` | Пользователь из сессии не найден в таблице `users`. |
| `422` | `Проверьте поля формы` | Не заполнен текущий или новый пароль, либо новый пароль короче 6 символов. |
| `422` | `Текущий пароль указан неверно` | `password_verify()` не подтвердил текущий пароль. |
| `500` | `Не удалось обновить пароль` | Неожиданная ошибка backend-а или базы данных. |

## Validation details

Если поля формы не прошли проверку, backend возвращает объект `errors`.

Пример:

```json
{
  "success": false,
  "message": "Проверьте поля формы",
  "extra": {
    "errors": {
      "current_password": "Введите текущий пароль",
      "new_password": "Новый пароль должен содержать минимум 6 символов"
    }
  }
}
```

Если текущий пароль неверный:

```json
{
  "success": false,
  "message": "Текущий пароль указан неверно",
  "extra": {
    "errors": {
      "current_password": "Текущий пароль указан неверно"
    }
  }
}
```

## Frontend notes

- Endpoint нужен для формы смены пароля в настройках пользователя.
- На фронте желательно иметь поля:
  - текущий пароль;
  - новый пароль;
  - повтор нового пароля.
- Повтор нового пароля можно проверять на фронте до отправки запроса.
- Backend принимает только `current_password` и `new_password`.
- При успехе нужно показать сообщение: `Пароль обновлён`.
- После успешной смены пароля можно очистить поля формы.
- При `422` нужно привязать ошибки к соответствующим полям.
- При `401` нужно считать пользователя неавторизованным и отправить на login.

## Backend notes

- Используется таблица `users`.
- Из таблицы выбираются поля `id` и `password_hash`.
- Текущий пароль проверяется через `password_verify()`.
- Новый пароль сохраняется через `password_hash($newPassword, PASSWORD_DEFAULT)`.
- При успешном обновлении обновляется поле `updated_at`.
- Endpoint не принимает повтор нового пароля; это ответственность frontend-а.
- Endpoint не проверяет отличие нового пароля от старого.

## PHP-код

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    errorResponse('Некорректный JSON', 400);
}

$currentPassword = trim($input['current_password'] ?? '');
$newPassword = trim($input['new_password'] ?? '');

$errors = [];

if ($currentPassword === '') {
    $errors['current_password'] = 'Введите текущий пароль';
}

if ($newPassword === '') {
    $errors['new_password'] = 'Введите новый пароль';
} elseif (mb_strlen($newPassword) < 6) {
    $errors['new_password'] = 'Новый пароль должен содержать минимум 6 символов';
}

if (!empty($errors)) {
    errorResponse('Проверьте поля формы', 422, [
        'errors' => $errors,
    ]);
}

try {
    $pdo = getDatabaseConnection();

    $userStmt = $pdo->prepare("
        SELECT id, password_hash
        FROM users
        WHERE id = :user_id
        LIMIT 1
    ");

    $userStmt->execute([
        'user_id' => $userId,
    ]);

    $user = $userStmt->fetch();

    if (!$user) {
        errorResponse('Пользователь не найден', 404);
    }

    if (!password_verify($currentPassword, $user['password_hash'])) {
        errorResponse('Текущий пароль указан неверно', 422, [
            'errors' => [
                'current_password' => 'Текущий пароль указан неверно',
            ],
        ]);
    }

    $passwordHash = password_hash($newPassword, PASSWORD_DEFAULT);

    $updateStmt = $pdo->prepare("
        UPDATE users
        SET
            password_hash = :password_hash,
            updated_at = NOW()
        WHERE id = :user_id
        LIMIT 1
    ");

    $updateStmt->execute([
        'password_hash' => $passwordHash,
        'user_id' => $userId,
    ]);

    successResponse([
        'message' => 'Пароль обновлён',
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось обновить пароль', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Документ структурирован из `php-after-changes/api-profile-password-updated.md`. |