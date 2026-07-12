# api/routes/show.php

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

Endpoint возвращает один маршрут текущего пользователя и список объектов внутри маршрута.

## Метод и URL

```http
GET /api/routes/show.php?route_id={id}
```

## Авторизация

Требуется user session.

Пользователь может получить только свой маршрут.

## Query params

| Параметр | Тип | Обязательный | Описание |
|---|---|---:|---|
| `route_id` | number | да | ID маршрута текущего пользователя. |

## Success response

HTTP `200`

```json
{
  "success": true,
  "data": {
    "route": {
      "id": 1,
      "user_id": 10,
      "title": "Маршрут",
      "description": "Описание",
      "is_public": 1,
      "share_token": "abc123",
      "created_at": "2026-07-04 10:00:00",
      "updated_at": "2026-07-04 11:00:00"
    },
    "places": [
      {
        "route_place_id": 5,
        "sort_order": 1,
        "note": "Заметка",
        "id": 123,
        "title": "Название объекта",
        "slug": "place-slug",
        "short_description": "Краткое описание",
        "cover_image": "/path/to/image.jpg",
        "address": "Адрес",
        "latitude": "47.222",
        "longitude": "39.718",
        "status": "published",
        "category_code": "museum",
        "category_title": "Музеи",
        "category_icon": "museum",
        "category_color": "#000000",
        "type_code": "place",
        "type_title": "Место"
      }
    ]
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `400` | `Не передан ID маршрута` | `route_id` отсутствует или меньше/равен нулю. |
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `404` | `Маршрут не найден или нет доступа` | Маршрут не найден или не принадлежит пользователю. |
| `500` | `Не удалось получить маршрут` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint использовать для страницы маршрута в личном кабинете.
- `places` уже отсортированы по порядку маршрута.
- Для drag-and-drop использовать `route_place_id` и `sort_order`.
- Для заметки к точке маршрута использовать поле `note`.
- Для публичной ссылки использовать `share_token`.

## Backend notes

- Используются таблицы:
  - `routes`;
  - `route_places`;
  - `places`;
  - `categories`;
  - `place_types`.
- Маршрут выбирается только по:
  - `id`;
  - `user_id`.
- Точки маршрута сортируются по:
  - `rp.sort_order ASC`;
  - `rp.id ASC`.

## PHP-код

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$routeId = (int) ($_GET['route_id'] ?? 0);

if ($routeId <= 0) {
    errorResponse('Не передан ID маршрута', 400);
}

try {

    $pdo = getDatabaseConnection();

    $routeStmt = $pdo->prepare("
        SELECT
            id,
            user_id,
            title,
            description,
            is_public,
            share_token,
            created_at,
            updated_at
        FROM routes
        WHERE id = :route_id
        AND user_id = :user_id
        LIMIT 1
    ");

    $routeStmt->execute([
        'route_id' => $routeId,
        'user_id' => $userId,
    ]);

    $route = $routeStmt->fetch();

    if (!$route) {
        errorResponse('Маршрут не найден или нет доступа', 404);
    }

    $placesStmt = $pdo->prepare("
        SELECT
            rp.id AS route_place_id,
            rp.sort_order,
            rp.note,

            p.id,
            p.title,
            p.slug,
            p.short_description,
            p.cover_image,
            p.address,
            p.latitude,
            p.longitude,
            p.status,

            c.code AS category_code,
            c.title AS category_title,
            c.icon AS category_icon,
            c.color AS category_color,

            pt.code AS type_code,
            pt.title AS type_title

        FROM route_places rp

        INNER JOIN places p
            ON p.id = rp.place_id

        INNER JOIN categories c
            ON c.id = p.category_id

        INNER JOIN place_types pt
            ON pt.id = p.place_type_id

        WHERE rp.route_id = :route_id

        ORDER BY rp.sort_order ASC, rp.id ASC
    ");

    $placesStmt->execute([
        'route_id' => $routeId,
    ]);

    $places = $placesStmt->fetchAll();

    successResponse([
        'route' => $route,
        'places' => $places,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось получить маршрут',
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