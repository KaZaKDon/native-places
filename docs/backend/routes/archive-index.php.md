# api/routes/archive-index.php

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

Endpoint возвращает архивные и завершённые маршруты текущего авторизованного пользователя.

В выборку попадают маршруты со статусами:

```text
archived
completed
```

## Метод и URL

```http
GET /api/routes/archive-index.php
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
        "title": "Маршрут",
        "description": "Описание",
        "is_public": 0,
        "share_token": "abc123",
        "status": "archived",
        "completed_at": null,
        "archived_at": "2026-07-04 10:00:00",
        "created_at": "2026-07-03 10:00:00",
        "updated_at": "2026-07-04 10:00:00",
        "places_count": 3
      }
    ]
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `500` | `Не удалось получить архив маршрутов` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint использовать для страницы архива маршрутов.
- Если `routes` пустой, показать empty state.
- `status` использовать для различения архивного и завершённого маршрута.
- `places_count` использовать для бейджа количества мест.
- `share_token` можно использовать для публичной ссылки, если она нужна.

## Backend notes

- Используются таблицы:
  - `routes`;
  - `route_places`.
- Выборка идёт только по текущему пользователю:
  - `r.user_id = :user_id`.
- Статусы:
  - `archived`;
  - `completed`.
- Сортировка:
  - `COALESCE(r.archived_at, r.completed_at, r.updated_at) DESC`;
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
            r.status,
            r.completed_at,
            r.archived_at,
            r.created_at,
            r.updated_at,

            COUNT(rp.id) AS places_count

        FROM routes r

        LEFT JOIN route_places rp
            ON rp.route_id = r.id

        WHERE r.user_id = :user_id
        AND r.status IN ('archived', 'completed')

        GROUP BY r.id

        ORDER BY
            COALESCE(r.archived_at, r.completed_at, r.updated_at) DESC,
            r.id DESC
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
        'Не удалось получить архив маршрутов',
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