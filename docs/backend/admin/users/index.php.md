# api/admin/users/index.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Users |
| Тип | PHP endpoint |
| Авторизация | Требуется admin/moderator session |
| Middleware | `requireAdminOrModerator()` |
| Источник | Код с хоста `api/admin/users/index.php` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Возвращает список пользователей для административной панели.

Endpoint получает пользователей вместе с:

- ролью;
- контактными данными;
- статусом профиля;
- количеством объявлений пользователя.

## Метод и URL

```http
GET /api/admin/users/index.php
```

## Авторизация

Требуется административная или модераторская сессия.

Проверка выполняется через:

```php
requireAdminOrModerator();
```

Endpoint доступен администратору и модератору.

## Request

Тело запроса не требуется.

## Success response

```json
{
  "success": true,
  "users": [
    {
      "id": 15,
      "role_id": 2,
      "email": "user@example.com",
      "first_name": "Иван",
      "last_name": "Иванов",
      "profile_status": "filled",
      "phone": "+79990000000",
      "telegram": "@user",
      "avatar": "/uploads/avatars/user.webp",
      "status": "active",
      "created_at": "2026-06-01 12:00:00",
      "updated_at": "2026-06-02 12:00:00",
      "role_code": "user",
      "role_title": "Пользователь",
      "places_count": 3
    }
  ]
}
```

## Структура `users[]`

| Поле | Тип | Описание |
|---|---:|---|
| `id` | number | ID пользователя |
| `role_id` | number | ID роли |
| `email` | string | Email |
| `first_name` | string/null | Имя |
| `last_name` | string/null | Фамилия |
| `profile_status` | string/null | Статус заполнения профиля |
| `phone` | string/null | Телефон |
| `telegram` | string/null | Telegram |
| `avatar` | string/null | Аватар |
| `status` | string | Статус пользователя |
| `created_at` | string | Дата создания |
| `updated_at` | string/null | Дата обновления |
| `role_code` | string | Код роли |
| `role_title` | string | Название роли |
| `places_count` | number | Количество объявлений пользователя |

## Error responses

### 401 / 403 — нет доступа

Формируется в `requireAdminOrModerator()`.

Точный формат зависит от реализации `api/admin/shared/require-admin.php`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось получить список пользователей",
  "error": "..."
}
```

## Frontend notes

- Используется для страницы управления пользователями.
- Список уже отсортирован backend-ом:
  - `u.created_at DESC`;
  - `u.id DESC`.
- Endpoint не использует пагинацию.
- Endpoint не принимает фильтры.
- `places_count` можно показывать в таблице пользователей.
- Для подробной карточки пользователя использовать `show.php`.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdminOrModerator()`.
- Подключение к базе фактически приходит через `require-admin.php`.
- Данные берутся из таблицы `users`.
- Роль подтягивается из таблицы `roles`.
- Количество объявлений считается через подзапрос по таблице `places`.
- В ответ попадают пользователи всех статусов.

## PHP-код

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdminOrModerator();

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->query("
        SELECT
            u.id,
            u.role_id,
            u.email,
            u.first_name,
            u.last_name,
            u.profile_status,
            u.phone,
            u.telegram,
            u.avatar,
            u.status,
            u.created_at,
            u.updated_at,
            r.code AS role_code,
            r.title AS role_title,
            COALESCE(pc.places_count, 0) AS places_count
        FROM users u
        INNER JOIN roles r
            ON r.id = u.role_id
        LEFT JOIN (
            SELECT
                user_id,
                COUNT(*) AS places_count
            FROM places
            GROUP BY user_id
        ) pc
            ON pc.user_id = u.id
        ORDER BY u.created_at DESC, u.id DESC
    ");

    successResponse([
        'users' => $stmt->fetchAll(),
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить список пользователей', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Файл оформлен по коду с хоста и перенесён в структуру `docs/backend/admin/users`. |