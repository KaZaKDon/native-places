# api/admin/reviews/show.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Reviews |
| Тип | PHP endpoint |
| Авторизация | Требуется admin/moderator session |
| Middleware | `requireAdminOrModerator()` |
| Источник | Код с хоста `api/admin/reviews/show.php` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Возвращает подробную карточку отзыва для административной панели.

Endpoint отдаёт:

- данные отзыва;
- данные объявления, к которому относится отзыв;
- данные автора отзыва.

## Метод и URL

```http
GET /api/admin/reviews/show.php?id=10
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
| `id` | number | да | ID отзыва |

## Success response

```json
{
  "success": true,
  "review": {
    "id": 10,
    "place_id": 123,
    "user_id": 15,
    "review_text": "Хорошее место",
    "status": "pending",
    "created_at": "2026-06-01 12:00:00",
    "updated_at": "2026-06-01 12:00:00",
    "moderated_at": null,
    "place_title": "Название места",
    "place_slug": "place-slug",
    "place_status": "published",
    "place_short_description": "Краткое описание",
    "cover_image": "/uploads/places/image.webp",
    "user_email": "user@example.com",
    "user_first_name": "Иван",
    "user_last_name": "Иванов",
    "user_avatar": "/uploads/avatars/user.webp",
    "user_phone": "+79990000000",
    "user_telegram": "@user"
  }
}
```

## Структура `review`

| Поле | Тип | Описание |
|---|---:|---|
| `id` | number | ID отзыва |
| `place_id` | number | ID объявления |
| `user_id` | number | ID автора отзыва |
| `review_text` | string | Текст отзыва |
| `status` | string | Статус отзыва |
| `created_at` | string | Дата создания |
| `updated_at` | string/null | Дата обновления |
| `moderated_at` | string/null | Дата модерации |
| `place_title` | string | Название объявления |
| `place_slug` | string | Slug объявления |
| `place_status` | string | Статус объявления |
| `place_short_description` | string/null | Краткое описание объявления |
| `cover_image` | string/null | Обложка объявления |
| `user_email` | string | Email автора |
| `user_first_name` | string/null | Имя автора |
| `user_last_name` | string/null | Фамилия автора |
| `user_avatar` | string/null | Аватар автора |
| `user_phone` | string/null | Телефон автора |
| `user_telegram` | string/null | Telegram автора |

## Error responses

### 422 — не передан ID отзыва

```json
{
  "success": false,
  "message": "Не передан ID отзыва"
}
```

### 404 — отзыв не найден

```json
{
  "success": false,
  "message": "Отзыв не найден"
}
```

### 401 / 403 — нет доступа

Формируется в `requireAdminOrModerator()`.

Точный формат зависит от реализации `api/admin/shared/require-admin.php`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось получить отзыв",
  "error": "..."
}
```

## Frontend notes

- Используется для карточки отзыва в админке.
- Можно показать данные объявления и автора отзыва.
- Для перехода к объявлению использовать `place_id` или `place_slug`.
- Для публикации отзыва использовать `publish.php`.
- Для отклонения отзыва использовать `reject.php`.
- Endpoint только читает данные, статус отзыва не меняет.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdminOrModerator()`.
- Подключение к базе фактически приходит через `require-admin.php`.
- Данные отзыва берутся из `reviews`.
- Данные объявления подтягиваются из `places`.
- Автор отзыва подтягивается из `users`.
- Endpoint не пишет moderator-log, потому что только читает данные.

## PHP-код

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdminOrModerator();

$reviewId = (int) ($_GET['id'] ?? 0);

if ($reviewId <= 0) {
    errorResponse('Не передан ID отзыва', 422);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            r.id,
            r.place_id,
            r.user_id,
            r.review_text,
            r.status,
            r.created_at,
            r.updated_at,
            r.moderated_at,

            p.title AS place_title,
            p.slug AS place_slug,
            p.status AS place_status,
            p.short_description AS place_short_description,
            p.cover_image,

            u.email AS user_email,
            u.first_name AS user_first_name,
            u.last_name AS user_last_name,
            u.avatar AS user_avatar,
            u.phone AS user_phone,
            u.telegram AS user_telegram
        FROM reviews r
        INNER JOIN places p
            ON p.id = r.place_id
        INNER JOIN users u
            ON u.id = r.user_id
        WHERE r.id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $reviewId,
    ]);

    $review = $stmt->fetch();

    if (!$review) {
        errorResponse('Отзыв не найден', 404);
    }

    successResponse([
        'review' => $review,
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить отзыв', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-05 | Файл оформлен по коду с хоста и перенесён в структуру `docs/backend/admin/reviews`. |