# api/routes/archive.php

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

Endpoint перемещает маршрут текущего пользователя в архив.

После успешного выполнения маршрут получает статус:

```text
archived
```

## Метод и URL

```http
POST /api/routes/archive.php
```

## Авторизация

Требуется user session.

Пользователь может архивировать только свой маршрут.

## Request

Тело запроса передаётся в формате JSON.

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
    "message": "Маршрут перемещён в архив",
    "route_id": 1,
    "status": "archived"
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `400` | `Не передан ID маршрута` | `route_id` отсутствует или меньше/равен нулю. |
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `404` | `Маршрут не найден или нет доступа` | Маршрут не найден или не принадлежит пользователю. |
| `422` | `Маршрут уже находится в архиве` | Маршрут уже имеет статус `archived`. |
| `500` | `Не удалось переместить маршрут в архив` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Использовать для кнопки «В архив».
- После успеха убрать маршрут из активного списка или сменить статус локально.
- Если маршрут уже в архиве, backend вернёт `422`.

## Backend notes

- Используется таблица `routes`.
- Проверяется принадлежность маршрута текущему пользователю.
- Обновляются поля:
  - `status = 'archived'`;
  - `archived_at = NOW()`;
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

    if ($route['status'] === 'archived') {
        errorResponse('Маршрут уже находится в архиве', 422);
    }

    $updateStmt = $pdo->prepare("
        UPDATE routes
        SET
            status = 'archived',
            archived_at = NOW(),
            updated_at = NOW()
        WHERE id = :route_id
        LIMIT 1
    ");

    $updateStmt->execute([
        'route_id' => $routeId,
    ]);

    successResponse([
        'message' => 'Маршрут перемещён в архив',
        'route_id' => $routeId,
        'status' => 'archived',
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось переместить маршрут в архив',
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