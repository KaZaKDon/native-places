# api/admin/reports/show.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Reports |
| Тип | PHP endpoint |
| Авторизация | Требуется admin/moderator session |
| Middleware | `requireAdminOrModerator()` |
| Источник | Код с хоста `api/admin/reports/show.php` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Возвращает подробную карточку жалобы для административной панели.

Endpoint отдаёт:

- данные жалобы;
- данные объявления, на которое пожаловались;
- данные пользователя, который отправил жалобу.

## Метод и URL

```http
GET /api/admin/reports/show.php?id=12
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
| `id` | number | да | ID жалобы |

## Success response

```json
{
  "success": true,
  "report": {
    "id": 12,
    "place_id": 123,
    "user_id": 15,
    "report_type": "spam",
    "message": "Жалоба пользователя",
    "status": "new",
    "created_at": "2026-06-01 12:00:00",
    "updated_at": "2026-06-01 12:00:00",
    "resolved_at": null,
    "place_title": "Название места",
    "place_slug": "place-slug",
    "place_status": "published",
    "place_short_description": "Краткое описание",
    "cover_image": "/uploads/places/image.webp",
    "address": "Адрес",
    "user_email": "user@example.com",
    "user_first_name": "Иван",
    "user_last_name": "Иванов",
    "user_phone": "+79990000000",
    "user_telegram": "@user"
  }
}
```

## Структура `report`

| Поле | Тип | Описание |
|---|---:|---|
| `id` | number | ID жалобы |
| `place_id` | number | ID объявления |
| `user_id` | number | ID автора жалобы |
| `report_type` | string | Тип жалобы |
| `message` | string/null | Текст жалобы |
| `status` | string | Статус жалобы |
| `created_at` | string | Дата создания |
| `updated_at` | string/null | Дата обновления |
| `resolved_at` | string/null | Дата решения |
| `place_title` | string | Название объявления |
| `place_slug` | string | Slug объявления |
| `place_status` | string | Статус объявления |
| `place_short_description` | string/null | Краткое описание объявления |
| `cover_image` | string/null | Обложка объявления |
| `address` | string/null | Адрес объявления |
| `user_email` | string | Email автора жалобы |
| `user_first_name` | string/null | Имя автора |
| `user_last_name` | string/null | Фамилия автора |
| `user_phone` | string/null | Телефон автора |
| `user_telegram` | string/null | Telegram автора |

## Error responses

### 422 — не передан ID жалобы

```json
{
  "success": false,
  "message": "Не передан ID жалобы"
}
```

### 404 — жалоба не найдена

```json
{
  "success": false,
  "message": "Жалоба не найдена"
}
```

### 401 / 403 — нет доступа

Формируется в `requireAdminOrModerator()`.

Точный формат зависит от реализации `api/admin/shared/require-admin.php`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось получить жалобу",
  "error": "..."
}
```

## Frontend notes

- Используется для карточки жалобы в админке.
- Можно показать данные объявления и пользователя, который пожаловался.
- Для перехода к объявлению использовать `place_id` или `place_slug`.
- Для закрытия жалобы использовать `close.php`.
- Endpoint только читает данные, статус жалобы не меняет.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdminOrModerator()`.
- Подключение к базе фактически приходит через `require-admin.php`.
- Данные жалобы берутся из `reports`.
- Данные объявления подтягиваются из `places`.
- Автор жалобы подтягивается из `users`.
- Endpoint не пишет moderator-log, потому что только читает данные.

## PHP-код

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdminOrModerator();

$reportId = (int) ($_GET['id'] ?? 0);

if ($reportId <= 0) {
    errorResponse('Не передан ID жалобы', 422);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            r.id,
            r.place_id,
            r.user_id,
            r.report_type,
            r.message,
            r.status,
            r.created_at,
            r.updated_at,
            r.resolved_at,

            p.title AS place_title,
            p.slug AS place_slug,
            p.status AS place_status,
            p.short_description AS place_short_description,
            p.cover_image,
            p.address,

            u.email AS user_email,
            u.first_name AS user_first_name,
            u.last_name AS user_last_name,
            u.phone AS user_phone,
            u.telegram AS user_telegram
        FROM reports r
        INNER JOIN places p
            ON p.id = r.place_id
        INNER JOIN users u
            ON u.id = r.user_id
        WHERE r.id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $reportId,
    ]);

    $report = $stmt->fetch();

    if (!$report) {
        errorResponse('Жалоба не найдена', 404);
    }

    successResponse([
        'report' => $report,
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить жалобу', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Файл оформлен по коду с хоста и перенесён в структуру `docs/backend/admin/reports`. |