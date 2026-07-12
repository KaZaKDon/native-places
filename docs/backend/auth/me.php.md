# api/auth/me.php

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

Endpoint возвращает текущего авторизованного пользователя по PHP-сессии.

Используется для восстановления состояния авторизации после перезагрузки страницы.

## Метод и URL

```http
GET /api/auth/me.php
```

## Авторизация

Формально endpoint можно вызвать без авторизации.

Если сессии нет, он вернёт:

```json
{
  "authenticated": false,
  "user": null
}
```

## Request

Тело запроса не требуется.

Query-параметры не используются.

## Success response

### Пользователь авторизован

HTTP `200`

```json
{
  "success": true,
  "data": {
    "authenticated": true,
    "user": {
      "id": 1,
      "role_id": 1,
      "email": "user@example.com",
      "first_name": "Иван",
      "profile_status": "Путешественник",
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

### Пользователь не авторизован

HTTP `200`

```json
{
  "success": true,
  "data": {
    "authenticated": false,
    "user": null
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `500` | `Не удалось получить текущего пользователя` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint вызывать при старте приложения.
- Для работы session cookie frontend должен отправлять credentials.
- Если `authenticated = false`, пользователь не залогинен.
- Если пользователь из сессии не найден или неактивен, backend уничтожает сессию и возвращает `authenticated = false`.
- Endpoint не возвращает HTTP `401` при отсутствии сессии — это нормальное поведение.

## Backend notes

- Используются таблицы:
  - `users`;
  - `roles`.
- ID пользователя берётся из:
  - `$_SESSION['user_id']`.
- Если пользователя нет или его статус не `active`, вызывается `session_destroy()`.

## PHP-код

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

session_start();

$userId = $_SESSION['user_id'] ?? null;

if (!$userId) {
    successResponse([
        'authenticated' => false,
        'user' => null,
    ]);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            u.id,
            u.role_id,
            u.email,
            u.first_name,
            u.profile_status,
            u.phone,
            u.telegram,
            u.avatar,
            u.status,

            r.code AS role_code,
            r.title AS role_title

        FROM users u
        INNER JOIN roles r ON r.id = u.role_id

        WHERE u.id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => (int) $userId,
    ]);

    $user = $stmt->fetch();

    if (!$user || $user['status'] !== 'active') {
        session_destroy();

        successResponse([
            'authenticated' => false,
            'user' => null,
        ]);
    }

    successResponse([
        'authenticated' => true,
        'user' => $user,
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить текущего пользователя', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Документ структурирован из `docs/API_FULL_TEXT.md`. |