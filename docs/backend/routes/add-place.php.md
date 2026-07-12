# api/routes/add-place.php

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

Endpoint добавляет опубликованный объект в активный маршрут текущего пользователя.

Если объект уже есть в маршруте, backend возвращает ошибку.

## Метод и URL

```http
POST /api/routes/add-place.php
```

## Авторизация

Требуется user session.

Endpoint вызывает:

```php
$userId = requireAuth();
```

Пользователь может добавлять места только в свой активный маршрут.

## Request

Тело запроса передаётся в формате JSON.

```json
{
  "route_id": 1,
  "place_id": 123,
  "note": "Заметка к месту"
}
```

## Request fields

| Поле | Тип | Обязательное | Правила |
|---|---|---:|---|
| `route_id` | number | да | ID активного маршрута текущего пользователя. |
| `place_id` | number | да | ID опубликованного объекта. |
| `note` | string | нет | Заметка к объекту внутри маршрута. |

## Success response

HTTP `200`

```json
{
  "success": true,
  "data": {
    "message": "Объект добавлен в маршрут",
    "route_id": 1,
    "place_id": 123,
    "sort_order": 3
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `400` | `Не передан ID маршрута` | `route_id` отсутствует или меньше/равен нулю. |
| `400` | `Не передан ID объекта` | `place_id` отсутствует или меньше/равен нулю. |
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `404` | `Активный маршрут не найден или нет доступа` | Маршрут не найден, не принадлежит пользователю или не активен. |
| `404` | `Объект не найден или не опубликован` | Объект не найден или не опубликован. |
| `422` | `Объект уже добавлен в маршрут` | Такой объект уже есть в маршруте. |
| `500` | `Не удалось добавить объект в маршрут` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint использовать для кнопки «Добавить в маршрут».
- После успеха можно обновить маршрут или локально добавить объект.
- `sort_order` возвращает позицию объекта в маршруте.
- Если объект уже добавлен, показать пользователю соответствующее сообщение.
- Если маршрутов нет, сначала создать маршрут через `api/routes/create.php`.

## Backend notes

- Используются таблицы:
  - `routes`;
  - `places`;
  - `route_places`.
- Маршрут должен:
  - принадлежать текущему пользователю;
  - иметь `status = 'active'`.
- Объект должен иметь:
  - `status = 'published'`.
- `sort_order` считается как:
  - `MAX(sort_order) + 1`.
- После добавления обновляется:
  - `routes.updated_at`.

## PHP-код

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(
    file_get_contents('php://input'),
    true
);

$routeId = (int) ($input['route_id'] ?? 0);
$placeId = (int) ($input['place_id'] ?? 0);
$note = trim($input['note'] ?? '');

if ($routeId <= 0) {
    errorResponse('Не передан ID маршрута', 400);
}

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

try {

    $pdo = getDatabaseConnection();

    $routeStmt = $pdo->prepare("
        SELECT id
        FROM routes
        WHERE id = :route_id
        AND user_id = :user_id
        AND status = 'active'
        LIMIT 1
    ");

    $routeStmt->execute([
        'route_id' => $routeId,
        'user_id' => $userId,
    ]);

    $route = $routeStmt->fetch();

    if (!$route) {
        errorResponse('Активный маршрут не найден или нет доступа', 404);
    }

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
        errorResponse('Объект не найден или не опубликован', 404);
    }

    $existsStmt = $pdo->prepare("
        SELECT id
        FROM route_places
        WHERE route_id = :route_id
        AND place_id = :place_id
        LIMIT 1
    ");

    $existsStmt->execute([
        'route_id' => $routeId,
        'place_id' => $placeId,
    ]);

    if ($existsStmt->fetch()) {
        errorResponse('Объект уже добавлен в маршрут', 422);
    }

    $orderStmt = $pdo->prepare("
        SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order
        FROM route_places
        WHERE route_id = :route_id
    ");

    $orderStmt->execute([
        'route_id' => $routeId,
    ]);

    $sortOrder = (int) $orderStmt->fetch()['next_order'];

    $insertStmt = $pdo->prepare("
        INSERT INTO route_places (
            route_id,
            place_id,
            sort_order,
            note,
            created_at
        ) VALUES (
            :route_id,
            :place_id,
            :sort_order,
            :note,
            NOW()
        )
    ");

    $insertStmt->execute([
        'route_id' => $routeId,
        'place_id' => $placeId,
        'sort_order' => $sortOrder,
        'note' => $note !== '' ? $note : null,
    ]);

    $updateRouteStmt = $pdo->prepare("
        UPDATE routes
        SET updated_at = NOW()
        WHERE id = :route_id
        LIMIT 1
    ");

    $updateRouteStmt->execute([
        'route_id' => $routeId,
    ]);

    successResponse([
        'message' => 'Объект добавлен в маршрут',
        'route_id' => $routeId,
        'place_id' => $placeId,
        'sort_order' => $sortOrder,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось добавить объект в маршрут',
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