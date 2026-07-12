# api/admin/users/show.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Users |
| Тип | PHP endpoint |
| Авторизация | Требуется admin/moderator session |
| Middleware | `requireAdminOrModerator()` |
| Источник | Код с хоста `api/admin/users/show.php` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Возвращает подробную карточку пользователя для административной панели.

Endpoint отдаёт:

- данные пользователя;
- список объявлений пользователя;
- текущую или последнюю подписку;
- полную историю подписок.

## Метод и URL

```http
GET /api/admin/users/show.php?id=15
```

## Авторизация

Требуется административная или модераторская сессия.

Проверка выполняется через:

```php
requireAdminOrModerator();
```

Endpoint доступен администратору и модератору.

## Request

### Query params

| Параметр | Тип | Обязательный | Описание |
|---|---:|---:|---|
| `id` | number | да | ID пользователя |

### Пример

```http
GET /api/admin/users/show.php?id=15
```

## Success response

```json
{
  "success": true,
  "user": {
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
    "role_title": "Пользователь"
  },
  "places": [
    {
      "id": 1,
      "title": "Место",
      "slug": "place-slug",
      "status": "published",
      "publication_type": "free",
      "payment_status": "paid",
      "created_at": "2026-06-01 12:00:00",
      "updated_at": "2026-06-02 12:00:00",
      "category_code": "food",
      "category_title": "Еда",
      "type_code": "restaurant",
      "type_title": "Ресторан"
    }
  ],
  "subscription": {
    "id": 3,
    "user_id": 15,
    "plan_id": 2,
    "source": "admin",
    "status": "active",
    "starts_at": "2026-06-01 12:00:00",
    "expires_at": null,
    "created_at": "2026-06-01 12:00:00",
    "updated_at": "2026-06-01 12:00:00",
    "plan_code": "pro",
    "plan_title": "Pro",
    "plan_price": "990.00",
    "duration_days": 30,
    "max_places": 10
  },
  "subscriptions": []
}
```

## Структура ответа

### `user`

Данные пользователя с ролью.

| Поле | Тип | Описание |
|---|---:|---|
| `id` | number | ID пользователя |
| `role_id` | number | ID роли |
| `email` | string | Email |
| `first_name` | string/null | Имя |
| `last_name` | string/null | Фамилия |
| `profile_status` | string/null | Статус профиля |
| `phone` | string/null | Телефон |
| `telegram` | string/null | Telegram |
| `avatar` | string/null | Аватар |
| `status` | string | Статус пользователя |
| `created_at` | string | Дата создания |
| `updated_at` | string/null | Дата обновления |
| `role_code` | string | Код роли |
| `role_title` | string | Название роли |

### `places[]`

Объявления пользователя.

| Поле | Тип | Описание |
|---|---:|---|
| `id` | number | ID объявления |
| `title` | string | Название |
| `slug` | string | Slug |
| `status` | string | Статус объявления |
| `publication_type` | string/null | Тип публикации |
| `payment_status` | string/null | Статус оплаты |
| `created_at` | string | Дата создания |
| `updated_at` | string/null | Дата обновления |
| `category_code` | string/null | Код категории |
| `category_title` | string/null | Название категории |
| `type_code` | string/null | Код типа места |
| `type_title` | string/null | Название типа места |

### `subscription`

Текущая или последняя подписка пользователя.

Выбирается по правилу:

```sql
ORDER BY
    CASE WHEN us.status = 'active' THEN 0 ELSE 1 END,
    us.id DESC
LIMIT 1
```

То есть активная подписка будет первой, если она есть.

### `subscriptions[]`

Полная история подписок пользователя.

Сортировка:

```sql
ORDER BY us.created_at DESC, us.id DESC
```

## Error responses

### 422 — не передан ID пользователя

```json
{
  "success": false,
  "message": "Не передан ID пользователя"
}
```

### 404 — пользователь не найден

```json
{
  "success": false,
  "message": "Пользователь не найден"
}
```

### 401 / 403 — нет доступа

Формируется в `requireAdminOrModerator()`.

Точный формат зависит от реализации `api/admin/shared/require-admin.php`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось получить пользователя",
  "error": "..."
}
```

## Frontend notes

- Используется для карточки пользователя в админке.
- На одной странице можно показать:
  - профиль;
  - роль;
  - статус;
  - объявления;
  - текущую подписку;
  - историю подписок.
- Для смены роли использовать `update-role.php`.
- Для смены статуса использовать `update-status.php`.
- Для управления подпиской использовать `update-subscription.php`.
- Для назначения модератором использовать `make-moderator.php`.
- Для генерации кода модератора использовать `generate-moderator-code.php`.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdminOrModerator()`.
- Подключение к базе фактически приходит через `require-admin.php`.
- Endpoint делает несколько запросов:
  - пользователь;
  - объявления;
  - текущая/последняя подписка;
  - история подписок.
- Пароль пользователя не возвращается.
- Endpoint не фильтрует объявления по статусу — возвращает все объявления пользователя.

## PHP-код

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdminOrModerator();

$userId = (int) ($_GET['id'] ?? 0);

if ($userId <= 0) {
    errorResponse('Не передан ID пользователя', 422);
}

try {
    $pdo = getDatabaseConnection();

    $userStmt = $pdo->prepare("
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
            r.title AS role_title
        FROM users u
        INNER JOIN roles r
            ON r.id = u.role_id
        WHERE u.id = :id
        LIMIT 1
    ");

    $userStmt->execute([
        'id' => $userId,
    ]);

    $user = $userStmt->fetch();

    if (!$user) {
        errorResponse('Пользователь не найден', 404);
    }

    $placesStmt = $pdo->prepare("
        SELECT
            p.id,
            p.title,
            p.slug,
            p.status,
            p.publication_type,
            p.payment_status,
            p.created_at,
            p.updated_at,
            c.code AS category_code,
            c.title AS category_title,
            pt.code AS type_code,
            pt.title AS type_title
        FROM places p
        LEFT JOIN categories c
            ON c.id = p.category_id
        LEFT JOIN place_types pt
            ON pt.id = p.place_type_id
        WHERE p.user_id = :user_id
        ORDER BY p.created_at DESC, p.id DESC
    ");

    $placesStmt->execute([
        'user_id' => $userId,
    ]);

    $subscriptionStmt = $pdo->prepare("
        SELECT
            us.id,
            us.user_id,
            us.plan_id,
            us.source,
            us.status,
            us.starts_at,
            us.expires_at,
            us.created_at,
            us.updated_at,
            pl.code AS plan_code,
            pl.title AS plan_title,
            pl.price AS plan_price,
            pl.duration_days,
            pl.max_places
        FROM user_subscriptions us
        LEFT JOIN plans pl
            ON pl.id = us.plan_id
        WHERE us.user_id = :user_id
        ORDER BY
            CASE WHEN us.status = 'active' THEN 0 ELSE 1 END,
            us.id DESC
        LIMIT 1
    ");

    $subscriptionStmt->execute([
        'user_id' => $userId,
    ]);

    $subscriptionsStmt = $pdo->prepare("
        SELECT
            us.id,
            us.user_id,
            us.plan_id,
            us.source,
            us.status,
            us.starts_at,
            us.expires_at,
            us.created_at,
            us.updated_at,
            pl.code AS plan_code,
            pl.title AS plan_title,
            pl.price AS plan_price,
            pl.duration_days,
            pl.max_places
        FROM user_subscriptions us
        LEFT JOIN plans pl
            ON pl.id = us.plan_id
        WHERE us.user_id = :user_id
        ORDER BY us.created_at DESC, us.id DESC
    ");

    $subscriptionsStmt->execute([
        'user_id' => $userId,
    ]);

    successResponse([
        'user' => $user,
        'places' => $placesStmt->fetchAll(),
        'subscription' => $subscriptionStmt->fetch() ?: null,
        'subscriptions' => $subscriptionsStmt->fetchAll(),
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить пользователя', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Файл оформлен по коду с хоста и перенесён в структуру `docs/backend/admin/users`. |