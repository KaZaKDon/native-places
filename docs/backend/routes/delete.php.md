# api/routes/delete.php

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

Endpoint полностью удаляет маршрут текущего пользователя.

Удаляются:

1. Все точки маршрута из `route_places`.
2. Сам маршрут из `routes`.

## Метод и URL

```http
POST /api/routes/delete.php
```

## Авторизация

Требуется user session.

Пользователь может удалить только свой маршрут.

## Request

Тело запроса передаётся в формате JSON.

```json
{
  "route_id": 1
}
```

## Request fields

| Поле | Тип | Обязательное | Описание |
|---|---|---:|---|
| `route_id` | number | да | ID маршрута текущего пользователя. |

## Success response

HTTP `200`

```json
{
  "success": true,
  "data": {
    "message": "Маршрут успешно удалён",
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
| `500` | `Не удалось удалить маршрут` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Использовать для действия «Удалить маршрут».
- Желательно показывать confirm modal.
- После успеха убрать маршрут из списка.
- Действие удаляет маршрут полностью, не архивирует его.
- Если нужно мягкое удаление, использовать `api/routes/archive.php`.

## Backend notes

- Используются таблицы:
  - `routes`;
  - `route_places`.
- Сначала проверяется, что маршрут принадлежит текущему пользователю.
- Удаление выполняется в транзакции.
- Сначала удаляются `route_places`.
- Затем удаляется запись из `routes`.
- При ошибке транзакция откатывается.

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

if ($routeId <= 0) {
    errorResponse('Не передан ID маршрута', 400);
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

    $deletePlacesStmt = $pdo->prepare("
        DELETE FROM route_places
        WHERE route_id = :route_id
    ");

    $deletePlacesStmt->execute([
        'route_id' => $routeId,
    ]);

    $deleteRouteStmt = $pdo->prepare("
        DELETE FROM routes
        WHERE id = :route_id
        LIMIT 1
    ");

    $deleteRouteStmt->execute([
        'route_id' => $routeId,
    ]);

    $pdo->commit();

    successResponse([
        'message' => 'Маршрут успешно удалён',
        'route_id' => $routeId,
    ]);

} catch (Throwable $e) {

    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse(
        'Не удалось удалить маршрут',
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