# api/profile/update.php

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

Endpoint обновляет основные данные профиля текущего авторизованного пользователя.

Обновляются:

- имя;
- статус профиля;
- телефон;
- Telegram.

Email, пароль и аватар этим endpoint-ом не обновляются.

## Метод и URL

```http
POST /api/profile/update.php
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
  "first_name": "Иван",
  "profile_status": "Путешественник",
  "phone": "+79990000000",
  "telegram": "@username"
}
```

## Request fields

| Поле | Тип | Обязательное | Правила |
|---|---|---:|---|
| `first_name` | string | да | Не пустое. |
| `profile_status` | string | нет | Максимум 255 символов. |
| `phone` | string | нет | Если пусто, сохраняется `null`. |
| `telegram` | string | нет | Если пусто, сохраняется `null`. |

## Success response

HTTP `200`

```json
{
  "success": true,
  "data": {
    "message": "Профиль успешно обновлён",
    "profile": {
      "first_name": "Иван",
      "profile_status": "Путешественник",
      "phone": "+79990000000",
      "telegram": "@username"
    }
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `422` | `Ошибка валидации` | Ошибки заполнения формы. |
| `500` | `Не удалось обновить профиль` | Неожиданная ошибка backend-а или базы данных. |

## Validation details

Пример ошибки:

```json
{
  "success": false,
  "message": "Ошибка валидации",
  "extra": {
    "errors": {
      "first_name": "Введите имя",
      "profile_status": "Статус не должен быть длиннее 255 символов"
    }
  }
}
```

## Frontend notes

- Endpoint используется для формы редактирования профиля.
- После успешного обновления можно обновить auth/profile store данными из `profile`.
- Если нужно получить полный профиль после обновления, дополнительно вызвать `api/profile/index.php`.
- При `422` ошибки нужно привязать к полям формы.
- При `401` отправить пользователя на login.

## Backend notes

- Используется таблица `users`.
- Обновляются поля:
  - `first_name`;
  - `profile_status`;
  - `phone`;
  - `telegram`;
  - `updated_at`.
- Пустые необязательные поля сохраняются как `null`.
- Endpoint не проверяет, существует ли пользователь после `requireAuth()`; он обновляет по `id`.

## PHP-код

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(
    file_get_contents('php://input'),
    true
);

$firstName = trim($input['first_name'] ?? '');
$profileStatus = trim($input['profile_status'] ?? '');
$phone = trim($input['phone'] ?? '');
$telegram = trim($input['telegram'] ?? '');

$errors = [];

if ($firstName === '') {
    $errors['first_name'] = 'Введите имя';
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
        UPDATE users
        SET
            first_name = :first_name,
            profile_status = :profile_status,
            phone = :phone,
            telegram = :telegram,
            updated_at = NOW()
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'first_name' => $firstName,
        'profile_status' => $profileStatus !== '' ? $profileStatus : null,
        'phone' => $phone !== '' ? $phone : null,
        'telegram' => $telegram !== '' ? $telegram : null,
        'id' => $userId,
    ]);

    successResponse([
        'message' => 'Профиль успешно обновлён',
        'profile' => [
            'first_name' => $firstName,
            'profile_status' => $profileStatus !== '' ? $profileStatus : null,
            'phone' => $phone !== '' ? $phone : null,
            'telegram' => $telegram !== '' ? $telegram : null,
        ],
    ]);

} catch (Throwable $e) {
    errorResponse('Не удалось обновить профиль', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Документ структурирован из `docs/API_FULL_TEXT.md`. |