# api/reviews/index.php

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

Endpoint возвращает опубликованные отзывы для конкретного объекта.

Используется на публичной странице объекта.

## Метод и URL

```http
GET /api/reviews/index.php?place_id={id}
```

## Авторизация

Не требуется.

Endpoint публичный.

## Query params

| Параметр | Тип | Обязательный | Описание |
|---|---|---:|---|
| `place_id` | number | да | ID опубликованного объекта. |

## Success response

HTTP `200`

```json
{
  "success": true,
  "data": {
    "place_id": 123,
    "reviews": [
      {
        "id": 1,
        "place_id": 123,
        "user_id": 10,
        "review_text": "Текст отзыва",
        "status": "published",
        "created_at": "2026-07-04 10:00:00",
        "user_name": "Иван",
        "user_avatar": "/uploads/avatars/user_10.jpg"
      }
    ]
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `400` | `Не передан ID объекта` | `place_id` отсутствует или меньше/равен нулю. |
| `404` | `Объект не найден` | Опубликованный объект не найден. |
| `500` | `Не удалось получить отзывы` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint использовать на публичной карточке объекта.
- Если `reviews` пустой, показать состояние «отзывов пока нет».
- Отзывы уже отсортированы от новых к старым.
- Для пользователя отзыва использовать:
  - `user_name`;
  - `user_avatar`.

## Backend notes

- Используются таблицы:
  - `places`;
  - `reviews`;
  - `users`.
- Сначала проверяется, что объект опубликован:
  - `places.status = 'published'`.
- Возвращаются только опубликованные отзывы:
  - `reviews.status = 'published'`.
- Сортировка:
  - `reviews.created_at DESC`;
  - `reviews.id DESC`.

## PHP-код

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

$placeId = (int) ($_GET['place_id'] ?? 0);

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

try {

    $pdo = getDatabaseConnection();

    $placeStmt = $pdo->prepare("
        SELECT id
        FROM places
        WHERE id = :place_id
        AND status = 'published'
        LIMIT 1
    ");

    $placeStmt->execute([
        'place_id' => $placeId,
    ]);

    $place = $placeStmt->fetch();

    if (!$place) {
        errorResponse('Объект не найден', 404);
    }

    $stmt = $pdo->prepare("
        SELECT
            r.id,
            r.place_id,
            r.user_id,
            r.review_text,
            r.status,
            r.created_at,

            u.first_name AS user_name,
            u.avatar AS user_avatar

        FROM reviews r

        INNER JOIN users u
            ON u.id = r.user_id

        WHERE r.place_id = :place_id
        AND r.status = 'published'

        ORDER BY r.created_at DESC, r.id DESC
    ");

    $stmt->execute([
        'place_id' => $placeId,
    ]);

    $reviews = $stmt->fetchAll();

    successResponse([
        'place_id' => $placeId,
        'reviews' => $reviews,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось получить отзывы',
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