# api/routes/share.php

## Статус

| Поле | Значение |
|---|---|
| Backend на хосте | да |
| Код сверено с хостом | да |
| Источник | `php-after-changes/api-routes-share-updated.md` |
| Подключено на фронте | уточнить |
| Нужны правки backend | нет |
| Нужны правки frontend | уточнить |

## Назначение

Endpoint возвращает публичный маршрут по `share_token`.

Используется для публичной страницы маршрута вида:

```text
/routes/share/:token
```

Логика endpoint-а построена так, что `share_token` сам является секретной ссылкой-доступом. Маршрут открывается по токену даже если флаг `is_public` ещё не успел переключиться frontend-ом.

При этом в публичную страницу маршрута попадают только опубликованные объекты маршрута.

## Метод и URL

```http
GET /api/routes/share.php?token={token}
```

## Авторизация

Не требуется.

Endpoint публичный.

Доступ контролируется наличием корректного `share_token`.

## Query params

| Параметр | Тип | Обязательный | Описание |
|---|---|---:|---|
| `token` | string | да | Публичный share token маршрута. |

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
      "description": "Описание маршрута",
      "is_public": 0,
      "share_token": "token",
      "created_at": "2026-07-04 10:00:00",
      "updated_at": "2026-07-04 10:00:00"
    },
    "places": [
      {
        "route_place_id": 1,
        "sort_order": 1,
        "note": "Заметка",
        "id": 123,
        "title": "Название места",
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
| `400` | `Не передан токен маршрута` | Query-параметр `token` отсутствует или пустой. |
| `404` | `Публичный маршрут не найден` | Маршрут с таким `share_token` не найден. |
| `500` | `Не удалось получить публичный маршрут` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint используется публичной страницей маршрута.
- На frontend route `/routes/share/:token` нужно взять `token` из URL и передать его в query-параметр API.
- Если backend вернул `404`, нужно показать страницу/состояние «Маршрут не найден».
- Если backend вернул `400`, значит frontend не передал token.
- Если `places` пустой, маршрут существует, но в нём нет опубликованных мест.
- В списке мест нужно использовать `sort_order` для порядка отображения.
- Поле `note` относится к месту внутри маршрута, а не к самому месту.
- На карте можно использовать `latitude` и `longitude`.
- Для карточки места можно использовать `title`, `slug`, `short_description`, `cover_image`, `address`, данные категории и типа.

## Backend notes

- Используются таблицы:
  - `routes`;
  - `route_places`;
  - `places`;
  - `categories`;
  - `place_types`.
- Маршрут ищется только по `share_token`.
- Флаг `is_public` не используется как обязательное условие доступа.
- Это сделано специально, чтобы уже выданная публичная ссылка работала даже если frontend не успел переключить `is_public`.
- В маршрут попадают только места со статусом:
  - `published`.
- Места сортируются по:
  - `rp.sort_order ASC`;
  - `rp.id ASC`.

## PHP-код

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

$token = trim($_GET['token'] ?? '');

if ($token === '') {
    errorResponse('Не передан токен маршрута', 400);
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
        WHERE share_token = :share_token
        LIMIT 1
    ");

    $routeStmt->execute([
        'share_token' => $token,
    ]);

    $route = $routeStmt->fetch();

    if (!$route) {
        errorResponse('Публичный маршрут не найден', 404);
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
        AND p.status = 'published'

        ORDER BY rp.sort_order ASC, rp.id ASC
    ");

    $placesStmt->execute([
        'route_id' => $route['id'],
    ]);

    $places = $placesStmt->fetchAll();

    successResponse([
        'route' => $route,
        'places' => $places,
    ]);
} catch (Throwable $e) {
    errorResponse(
        'Не удалось получить публичный маршрут',
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
| 2026-07-04 | Документ структурирован из `php-after-changes/api-routes-share-updated.md`. |