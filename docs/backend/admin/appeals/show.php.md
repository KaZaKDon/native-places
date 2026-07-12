# api/admin/appeals/show.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Appeals |
| Тип | PHP endpoint |
| Авторизация | Требуется admin/moderator session |
| Middleware | `requireAdminOrModerator()` |
| Источник | Код с хоста `api/admin/appeals/show.php` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Возвращает подробную карточку обращения пользователя для административной панели.

Endpoint отдаёт:

- данные обращения;
- данные пользователя, который создал обращение.

## Метод и URL

```http
GET /api/admin/appeals/show.php?id=5
```

## Авторизация

Требуется административная или модераторская сессия.

Проверка выполняется через:

```php
requireAdminOrModerator();
```

Endpoint доступен администратору и модератору.

## Query params

| Параметр | Тип | Обязательный | Описание |
|---|---:|---:|---|
| `id` | number | да | ID обращения |

## Success response

```json
{
  "success": true,
  "appeal": {
    "id": 5,
    "user_id": 15,
    "appeal_type": "support",
    "contact": "user@example.com",
    "message": "Текст обращения",
    "admin_response": null,
    "status": "new",
    "created_at": "2026-06-01 12:00:00",
    "updated_at": "2026-06-01 12:00:00",
    "closed_at": null,
    "user_email": "user@example.com",
    "user_first_name": "Иван",
    "user_last_name": "Иванов",
    "user_phone": "+79990000000",
    "user_telegram": "@user",
    "user_avatar": "/uploads/avatars/user.webp",
    "user_status": "active"
  }
}
```

## Структура `appeal`

| Поле | Тип | Описание |
|---|---:|---|
| `id` | number | ID обращения |
| `user_id` | number | ID пользователя |
| `appeal_type` | string | Тип обращения |
| `contact` | string/null | Контакт пользователя |
| `message` | string | Текст обращения |
| `admin_response` | string/null | Ответ администрации |
| `status` | string | Статус обращения |
| `created_at` | string | Дата создания |
| `updated_at` | string/null | Дата обновления |
| `closed_at` | string/null | Дата закрытия |
| `user_email` | string | Email пользователя |
| `user_first_name` | string/null | Имя пользователя |
| `user_last_name` | string/null | Фамилия пользователя |
| `user_phone` | string/null | Телефон пользователя |
| `user_telegram` | string/null | Telegram пользователя |
| `user_avatar` | string/null | Аватар пользователя |
| `user_status` | string | Статус пользователя |

## Error responses

### 422 — не передан ID обращения

```json
{
  "success": false,
  "message": "Не передан ID обращения"
}
```

### 404 — обращение не найдено

```json
{
  "success": false,
  "message": "Обращение не найдено"
}
```

### 401 / 403 — нет доступа

Формируется в `requireAdminOrModerator()`.

Точный формат зависит от реализации `api/admin/shared/require-admin.php`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось получить обращение",
  "error": "..."
}
```

## Frontend notes

- Используется для карточки обращения в админке.
- Можно показать текст обращения, контакт и данные пользователя.
- Для ответа администрации и смены статуса использовать `update.php`.
- Endpoint только читает данные, статус обращения не меняет.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdminOrModerator()`.
- Подключение к базе фактически приходит через `require-admin.php`.
- Данные обращения берутся из таблицы `appeals`.
- Данные пользователя подтягиваются из таблицы `users`.
- Endpoint не пишет moderator-log, потому что только читает данные.

## PHP-код

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdminOrModerator();

$appealId = (int) ($_GET['id'] ?? 0);

if ($appealId <= 0) {
    errorResponse('Не передан ID обращения', 422);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            a.id,
            a.user_id,
            a.appeal_type,
            a.contact,
            a.message,
            a.admin_response,
            a.status,
            a.created_at,
            a.updated_at,
            a.closed_at,

            u.email AS user_email,
            u.first_name AS user_first_name,
            u.last_name AS user_last_name,
            u.phone AS user_phone,
            u.telegram AS user_telegram,
            u.avatar AS user_avatar,
            u.status AS user_status
        FROM appeals a
        INNER JOIN users u
            ON u.id = a.user_id
        WHERE a.id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $appealId,
    ]);

    $appeal = $stmt->fetch();

    if (!$appeal) {
        errorResponse('Обращение не найдено', 404);
    }

    successResponse([
        'appeal' => $appeal,
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить обращение', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-05 | Файл оформлен по коду с хоста и перенесён в структуру `docs/backend/admin/appeals`. |