# api/profile/index.php

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

Endpoint возвращает профиль текущего авторизованного пользователя.

Используется в личном кабинете и настройках профиля.

## Метод и URL

```http
GET /api/profile/index.php
```

## Авторизация

Требуется user session.

Endpoint вызывает:

```php
$userId = requireAuth();
```

Если пользователь не авторизован, backend должен вернуть `401`.

## Request

Тело запроса не требуется.

Query-параметры не используются.

## Success response

HTTP `200`

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "first_name": "Иван",
      "profile_status": "Путешественник",
      "phone": "+79990000000",
      "telegram": "@username",
      "avatar": "/uploads/avatars/user_1_1234567890.jpg",
      "status": "active",
      "created_at": "2026-07-04 10:00:00",
      "role_code": "user",
      "role_title": "Пользователь"
    }
  }
}
```

## Response fields

| Поле | Тип | Описание |
|---|---|---|
| `id` | number | ID пользователя. |
| `email` | string | Email пользователя. |
| `first_name` | string | Имя пользователя. |
| `profile_status` | string/null | Статус/описание профиля. |
| `phone` | string/null | Телефон. |
| `telegram` | string/null | Telegram. |
| `avatar` | string/null | Путь к аватару. |
| `status` | string | Статус пользователя. |
| `created_at` | string | Дата регистрации. |
| `role_code` | string | Код роли. |
| `role_title` | string | Название роли. |

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `404` | `Пользователь не найден` | Пользователь из сессии не найден в базе. |
| `500` | `Не удалось получить профиль` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint используется для страницы профиля.
- Можно использовать для заполнения формы редактирования профиля.
- Для аватара использовать поле `avatar`.
- Если `avatar = null`, показать дефолтный аватар.
- При `401` отправить пользователя на login.
- При `404` желательно сбросить auth state и отправить пользователя на login.

## Backend notes

- Используются таблицы:
  - `users`;
  - `roles`.
- Пользователь ищется по ID из сессии.
- Endpoint не проверяет `users.status = active` в SQL, но возвращает поле `status`.

## PHP-код

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

try {

    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            u.id,
            u.email,
            u.first_name,
            u.profile_status,
            u.phone,
            u.telegram,
            u.avatar,
            u.status,
            u.created_at,

            r.code AS role_code,
            r.title AS role_title

        FROM users u
        INNER JOIN roles r
            ON r.id = u.role_id

        WHERE u.id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $userId,
    ]);

    $user = $stmt->fetch();

    if (!$user) {
        errorResponse('Пользователь не найден', 404);
    }

    successResponse([
        'user' => $user,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось получить профиль',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );

}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Документ структурирован из `docs/API_FULL_TEXT.md`. |