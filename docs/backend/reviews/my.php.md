# api/reviews/my.php

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

Endpoint возвращает отзывы текущего авторизованного пользователя.

Используется в личном кабинете для раздела «Мои отзывы».

## Метод и URL

```http
GET /api/reviews/my.php
```

## Авторизация

Требуется user session.

Endpoint вызывает:

```php
$userId = requireAuth();
```

## Request

Тело запроса не требуется.

Query-параметры не используются.

## Success response

HTTP `200`

```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "id": 1,
        "place_id": 123,
        "review_text": "Текст отзыва",
        "status": "pending",
        "created_at": "2026-07-04 10:00:00",
        "moderated_at": null,
        "place_title": "Название объекта",
        "place_slug": "place-slug",
        "cover_image": "/path/to/image.jpg"
      }
    ]
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `500` | `Не удалось получить отзывы пользователя` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint использовать для раздела «Мои отзывы».
- `status` показывает состояние модерации.
- Если `reviews` пустой, показать empty state.
- Для перехода на объект использовать `place_slug`.
- Для карточки использовать:
  - `place_title`;
  - `cover_image`;
  - `review_text`;
  - `status`;
  - `created_at`.

## Backend notes

- Используются таблицы:
  - `reviews`;
  - `places`.
- Выборка идёт только по текущему пользователю:
  - `reviews.user_id = :user_id`.
- Сортировка:
  - `reviews.created_at DESC`;
  - `reviews.id DESC`.

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
            r.id,
            r.place_id,
            r.review_text,
            r.status,
            r.created_at,
            r.moderated_at,

            p.title AS place_title,
            p.slug AS place_slug,
            p.cover_image

        FROM reviews r

        INNER JOIN places p
            ON p.id = r.place_id

        WHERE r.user_id = :user_id

        ORDER BY r.created_at DESC, r.id DESC
    ");

    $stmt->execute([
        'user_id' => $userId,
    ]);

    $reviews = $stmt->fetchAll();

    successResponse([
        'reviews' => $reviews,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось получить отзывы пользователя',
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