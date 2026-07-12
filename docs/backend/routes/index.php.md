# api/routes/index.php

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

Endpoint возвращает список маршрутов текущего авторизованного пользователя.

Для каждого маршрута возвращается количество объектов в маршруте.

## Метод и URL

```http
GET /api/routes/index.php
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
    "routes": [
      {
        "id": 1,
        "title": "Маршрут выходного дня",
        "description": "Описание маршрута",
        "is_public": 1,
        "share_token": "abc123",
        "created_at": "2026-07-04 10:00:00",
        "updated_at": "2026-07-04 11:00:00",
        "places_count": 5
      }
    ]
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `500` | `Не удалось получить маршруты` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint использовать для страницы «Мои маршруты».
- `places_count` использовать для бейджа количества мест.
- `share_token` можно использовать для публичной ссылки.
- Если `routes` пустой, показать empty state.
- Список уже отсортирован по `updated_at DESC`.

## Backend notes

- Используются таблицы:
  - `routes`;
  - `route_places`.
- Выборка идёт только по текущему пользователю:
  - `r.user_id = :user_id`.
- Количество объектов считается через:
  - `COUNT(rp.id) AS places_count`.
- Сортировка:
  - `r.updated_at DESC`;
  - `r.id DESC`.

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
            r.title,
            r.description,
            r.is_public,
            r.share_token,
            r.created_at,
            r.updated_at,

            COUNT(rp.id) AS places_count

        FROM routes r

        LEFT JOIN route_places rp
            ON rp.route_id = r.id

        WHERE r.user_id = :user_id

        GROUP BY r.id

        ORDER BY r.updated_at DESC, r.id DESC
    ");

    $stmt->execute([
        'user_id' => $userId,
    ]);

    $routes = $stmt->fetchAll();

    successResponse([
        'routes' => $routes,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось получить маршруты',
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