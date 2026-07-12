# api/routes/reorder.php

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

Endpoint обновляет порядок точек внутри маршрута текущего пользователя.

Используется после drag-and-drop сортировки мест в маршруте.

## Метод и URL

```http
POST /api/routes/reorder.php
```

## Авторизация

Требуется user session.

Пользователь может менять порядок только в своём маршруте.

## Request

Тело запроса передаётся в формате JSON.

```json
{
  "route_id": 1,
  "items": [5, 6, 7]
}
```

## Request fields

| Поле | Тип | Обязательное | Описание |
|---|---|---:|---|
| `route_id` | number | да | ID маршрута текущего пользователя. |
| `items` | array<number> | да | Массив ID точек маршрута из таблицы `route_places` в новом порядке. |

## Success response

HTTP `200`

```json
{
  "success": true,
  "data": {
    "message": "Порядок точек маршрута обновлён",
    "route_id": 1
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `400` | `Не передан ID маршрута` | `route_id` отсутствует или меньше/равен нулю. |
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `404` | `Маршрут не найден или нет доступа` | Маршрут не найден или не принадлежит пользователю. |
| `422` | `Некорректный список точек маршрута` | `items` не является массивом. |
| `500` | `Не удалось обновить порядок маршрута` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Использовать после изменения порядка точек маршрута.
- Передавать массив `route_place_id` в новом порядке.
- После успеха можно оставить локальный порядок.
- При ошибке лучше перезагрузить маршрут через `api/routes/show.php`.

## Backend notes

- Используются таблицы:
  - `routes`;
  - `route_places`.
- Сначала проверяется, что маршрут принадлежит текущему пользователю.
- Обновление выполняется в транзакции.
- Для каждого элемента массива `items` устанавливается:
  - `sort_order = index + 1`.
- В текущем коде нет отдельной проверки, что каждый `route_place_id` действительно относится к маршруту, но `UPDATE` ограничен условием:
  - `AND route_id = :route_id`.

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
$items = $input['items'] ?? [];

if ($routeId <= 0) {
    errorResponse('Не передан ID маршрута', 400);
}

if (!is_array($items)) {
    errorResponse('Некорректный список точек маршрута', 422);
}

try {

    $pdo = getDatabaseConnection();

    $routeStmt = $pdo->prepare("
        SELECT id
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

    $pdo->beginTransaction();

    $updateStmt = $pdo->prepare("
        UPDATE route_places
        SET sort_order = :sort_order
        WHERE id = :id
        AND route_id = :route_id
    ");

    foreach ($items as $index => $routePlaceId) {

        $updateStmt->execute([
            'sort_order' => $index + 1,
            'id' => (int) $routePlaceId,
            'route_id' => $routeId,
        ]);
    }

    $pdo->commit();

    successResponse([
        'message' => 'Порядок точек маршрута обновлён',
        'route_id' => $routeId,
    ]);

} catch (Throwable $e) {

    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse(
        'Не удалось обновить порядок маршрута',
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