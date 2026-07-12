# api/routes/complete.php

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

Endpoint завершает активный маршрут текущего пользователя.

Завершить можно только маршрут со статусом:

```text
active
```

После успешного выполнения маршрут получает статус:

```text
completed
```

## Метод и URL

```http
POST /api/routes/complete.php
```

## Авторизация

Требуется user session.

Пользователь может завершить только свой маршрут.

## Request

```json
{
  "route_id": 1
}
```

## Success response

HTTP `200`

```json
{
  "success": true,
  "data": {
    "message": "Маршрут завершён",
    "route_id": 1,
    "status": "completed"
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `400` | `Не передан ID маршрута` | `route_id` отсутствует или меньше/равен нулю. |
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `404` | `Маршрут не найден или нет доступа` | Маршрут не найден или не принадлежит пользователю. |
| `422` | `Завершить можно только активный маршрут` | Маршрут не имеет статус `active`. |
| `500` | `Не удалось завершить маршрут` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Использовать для кнопки «Завершить маршрут».
- После успеха можно перенести маршрут в завершённые/архивные.
- Желательно показать confirm modal перед завершением.

## Backend notes

- Используется таблица `routes`.
- Обновляются поля:
  - `status = 'completed'`;
  - `completed_at = NOW()`;
  - `archived_at = NULL`;
  - `updated_at = NOW()`.

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
        SELECT
            id,
            status
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

    if ($route['status'] !== 'active') {
        errorResponse('Завершить можно только активный маршрут', 422);
    }

    $updateStmt = $pdo->prepare("
        UPDATE routes
        SET
            status = 'completed',
            completed_at = NOW(),
            archived_at = NULL,
            updated_at = NOW()
        WHERE id = :route_id
        LIMIT 1
    ");

    $updateStmt->execute([
        'route_id' => $routeId,
    ]);

    successResponse([
        'message' => 'Маршрут завершён',
        'route_id' => $routeId,
        'status' => 'completed',
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось завершить маршрут',
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