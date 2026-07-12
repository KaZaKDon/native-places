# api/admin/dashboard/index.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Dashboard |
| Тип | PHP endpoint |
| Авторизация | Требуется admin/moderator session |
| Middleware | `requireAdminOrModerator()` |
| Источник | Код с хоста `api/admin/dashboard/index.php` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Возвращает краткую статистику для главной панели управления админки.

Endpoint собирает счётчики по:

- пользователям;
- объявлениям;
- жалобам;
- отзывам;
- активным кодам доступа.

## Метод и URL

```http
GET /api/admin/dashboard/index.php
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

Query-параметров в текущей реализации нет.

## Success response

```json
{
  "success": true,
  "dashboard": {
    "users_count": 120,
    "active_users_count": 100,
    "places_count": 50,
    "published_places_count": 35,
    "pending_places_count": 8,
    "rejected_places_count": 4,
    "archived_places_count": 3,
    "new_reports_count": 2,
    "closed_reports_count": 10,
    "pending_reviews_count": 5,
    "published_reviews_count": 40,
    "active_access_codes_count": 3
  }
}
```

## Структура `dashboard`

| Поле | Тип | Описание |
|---|---:|---|
| `users_count` | number | Пользователи, у которых `status <> 'deleted'` |
| `active_users_count` | number | Активные пользователи |
| `places_count` | number | Всего объявлений |
| `published_places_count` | number | Опубликованные объявления |
| `pending_places_count` | number | Объявления на модерации |
| `rejected_places_count` | number | Отклонённые объявления |
| `archived_places_count` | number | Архивные объявления со статусом `expired` |
| `new_reports_count` | number | Новые жалобы |
| `closed_reports_count` | number | Закрытые жалобы |
| `pending_reviews_count` | number | Отзывы на модерации |
| `published_reviews_count` | number | Опубликованные отзывы |
| `active_access_codes_count` | number | Активные коды доступа |

## Источники данных

### Пользователи

```sql
SELECT COUNT(*) AS total
FROM users
WHERE status <> 'deleted'
```

```sql
SELECT COUNT(*) AS total
FROM users
WHERE status = 'active'
```

### Объявления

```sql
SELECT COUNT(*) AS total
FROM places
```

```sql
SELECT COUNT(*) AS total
FROM places
WHERE status = 'published'
```

```sql
SELECT COUNT(*) AS total
FROM places
WHERE status = 'pending'
```

```sql
SELECT COUNT(*) AS total
FROM places
WHERE status = 'rejected'
```

```sql
SELECT COUNT(*) AS total
FROM places
WHERE status = 'expired'
```

### Жалобы

```sql
SELECT COUNT(*) AS total
FROM reports
WHERE status = 'new'
```

```sql
SELECT COUNT(*) AS total
FROM reports
WHERE status = 'closed'
```

### Отзывы

```sql
SELECT COUNT(*) AS total
FROM reviews
WHERE status = 'pending'
```

```sql
SELECT COUNT(*) AS total
FROM reviews
WHERE status = 'published'
```

### Коды доступа

```sql
SELECT COUNT(*) AS total
FROM admin_access_codes
WHERE status = 'active'
```

## Важное замечание по статусам жалоб

В других admin endpoint-ах для жалоб используется набор статусов:

```txt
new
in_progress
resolved
rejected
```

А в этом dashboard endpoint-е считается:

```sql
WHERE status = 'closed'
```

То есть здесь возможна несовместимость терминов:

- `reports/index.php` и `reports/close.php` работают с `resolved`;
- `dashboard/index.php` считает `closed_reports_count` по статусу `closed`.

Если в базе реально нет статуса `closed`, счётчик `closed_reports_count` будет всегда `0`.

## Error responses

### 401 / 403 — нет доступа

Формируется в `requireAdminOrModerator()`.

Точный формат зависит от реализации `api/admin/shared/require-admin.php`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось получить данные панели управления",
  "error": "..."
}
```

## Frontend notes

- Используется для главного dashboard админки.
- Этот endpoint проще, чем `api/admin/statistics/index.php`.
- Здесь возвращаются только числовые счётчики.
- Для расширенной статистики использовать `api/admin/statistics/index.php`.
- Нужно учитывать возможное расхождение по статусу закрытых жалоб: `closed` vs `resolved`.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdminOrModerator()`.
- Подключение к базе фактически приходит через `require-admin.php`.
- Endpoint выполняет отдельный SQL-запрос на каждый счётчик.
- Endpoint не пишет moderator-log, потому что только читает данные.
- В текущей реализации нет кеширования.
- В текущей реализации нет фильтра по периоду.

## PHP-код

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdminOrModerator();

try {
    $pdo = getDatabaseConnection();

    $usersStmt = $pdo->query("
        SELECT COUNT(*) AS total
        FROM users
        WHERE status <> 'deleted'
    ");

    $activeUsersStmt = $pdo->query("
        SELECT COUNT(*) AS total
        FROM users
        WHERE status = 'active'
    ");

    $placesStmt = $pdo->query("
        SELECT COUNT(*) AS total
        FROM places
    ");

    $publishedPlacesStmt = $pdo->query("
        SELECT COUNT(*) AS total
        FROM places
        WHERE status = 'published'
    ");

    $pendingPlacesStmt = $pdo->query("
        SELECT COUNT(*) AS total
        FROM places
        WHERE status = 'pending'
    ");

    $rejectedPlacesStmt = $pdo->query("
        SELECT COUNT(*) AS total
        FROM places
        WHERE status = 'rejected'
    ");

    $archivedPlacesStmt = $pdo->query("
        SELECT COUNT(*) AS total
        FROM places
        WHERE status = 'expired'
    ");

    $newReportsStmt = $pdo->query("
        SELECT COUNT(*) AS total
        FROM reports
        WHERE status = 'new'
    ");

    $closedReportsStmt = $pdo->query("
        SELECT COUNT(*) AS total
        FROM reports
        WHERE status = 'closed'
    ");

    $pendingReviewsStmt = $pdo->query("
        SELECT COUNT(*) AS total
        FROM reviews
        WHERE status = 'pending'
    ");

    $publishedReviewsStmt = $pdo->query("
        SELECT COUNT(*) AS total
        FROM reviews
        WHERE status = 'published'
    ");

    $activeAccessCodesStmt = $pdo->query("
        SELECT COUNT(*) AS total
        FROM admin_access_codes
        WHERE status = 'active'
    ");

    successResponse([
        'dashboard' => [
            'users_count' => (int) $usersStmt->fetch()['total'],
            'active_users_count' => (int) $activeUsersStmt->fetch()['total'],

            'places_count' => (int) $placesStmt->fetch()['total'],
            'published_places_count' => (int) $publishedPlacesStmt->fetch()['total'],
            'pending_places_count' => (int) $pendingPlacesStmt->fetch()['total'],
            'rejected_places_count' => (int) $rejectedPlacesStmt->fetch()['total'],
            'archived_places_count' => (int) $archivedPlacesStmt->fetch()['total'],

            'new_reports_count' => (int) $newReportsStmt->fetch()['total'],
            'closed_reports_count' => (int) $closedReportsStmt->fetch()['total'],

            'pending_reviews_count' => (int) $pendingReviewsStmt->fetch()['total'],
            'published_reviews_count' => (int) $publishedReviewsStmt->fetch()['total'],

            'active_access_codes_count' => (int) $activeAccessCodesStmt->fetch()['total'],
        ],
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить данные панели управления', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-05 | Файл оформлен по коду с хоста и перенесён в структуру `docs/backend/admin/dashboard`. |