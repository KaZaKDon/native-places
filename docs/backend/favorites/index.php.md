# api/favorites/index.php

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

Endpoint возвращает список избранных объектов текущего авторизованного пользователя.

В ответе приходят данные записи избранного и краткие данные объекта.

## Метод и URL

```http
GET /api/favorites/index.php
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
    "favorites": [
      {
        "favorite_id": 1,
        "favorite_created_at": "2026-07-04 10:00:00",
        "id": 123,
        "title": "Название объекта",
        "slug": "place-slug",
        "short_description": "Краткое описание",
        "cover_image": "/path/to/image.jpg",
        "address": "Адрес",
        "category_code": "museum",
        "category_title": "Музеи",
        "type_code": "place",
        "type_title": "Место"
      }
    ]
  }
}
```

## Response fields

| Поле | Тип | Описание |
|---|---|---|
| `favorite_id` | number | ID записи в таблице `favorites`. |
| `favorite_created_at` | string | Дата добавления в избранное. |
| `id` | number | ID объекта. |
| `title` | string | Название объекта. |
| `slug` | string | Slug объекта. |
| `short_description` | string/null | Краткое описание объекта. |
| `cover_image` | string/null | Обложка объекта. |
| `address` | string/null | Адрес. |
| `category_code` | string | Код категории. |
| `category_title` | string | Название категории. |
| `type_code` | string | Код типа объекта. |
| `type_title` | string | Название типа объекта. |

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `500` | `Не удалось получить избранное` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint используется для страницы «Избранное».
- Если `favorites` пустой, показать empty state.
- Для перехода к объекту использовать `slug`.
- Для карточки избранного использовать:
  - `title`;
  - `cover_image`;
  - `short_description`;
  - `address`;
  - `category_title`;
  - `type_title`.
- Для сортировки на фронте обычно ничего делать не нужно: backend сортирует по дате добавления в избранное.

## Backend notes

- Используются таблицы:
  - `favorites`;
  - `places`;
  - `categories`;
  - `place_types`.
- Выборка идёт только по текущему пользователю:
  - `f.user_id = :user_id`.
- Сортировка:
  - `f.created_at DESC`.
- В текущем коде нет дополнительной проверки, что объект всё ещё опубликован.

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
            f.id AS favorite_id,
            f.created_at AS favorite_created_at,

            p.id,
            p.title,
            p.slug,
            p.short_description,
            p.cover_image,
            p.address,

            c.code AS category_code,
            c.title AS category_title,

            pt.code AS type_code,
            pt.title AS type_title

        FROM favorites f

        INNER JOIN places p
            ON p.id = f.place_id

        INNER JOIN categories c
            ON c.id = p.category_id

        INNER JOIN place_types pt
            ON pt.id = p.place_type_id

        WHERE f.user_id = :user_id

        ORDER BY f.created_at DESC
    ");

    $stmt->execute([
        'user_id' => $userId,
    ]);

    $favorites = $stmt->fetchAll();

    successResponse([
        'favorites' => $favorites,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось получить избранное',
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