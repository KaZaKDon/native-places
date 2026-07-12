# api/routes/remove-place.php

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

Endpoint удаляет точку из маршрута текущего пользователя.

Удаляется запись из `route_places`, сам объект `places` не удаляется.

## Метод и URL

```http
POST /api/routes/remove-place.php
```

## Авторизация

Требуется user session.

Пользователь может удалить точку только из своего маршрута.

## Request

Тело запроса передаётся в формате JSON.

```json
{
  "route_place_id": 5
}
```

## Request fields

| Поле | Тип | Обязательное | Описание |
|---|---|---:|---|
| `route_place_id` | number | да | ID точки маршрута из таблицы `route_places`. |

## Success response

HTTP `200`

```json
{
  "success": true,
  "data": {
    "message": "Точка удалена из маршрута",
    "route_place_id": 5
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `400` | `Не передан ID точки маршрута` | `route_place_id` отсутствует или меньше/равен нулю. |
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `404` | `Точка маршрута не найдена` | Точка не найдена или относится к чужому маршруту. |
| `500` | `Не удалось удалить точку маршрута` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Использовать для кнопки удаления места из маршрута.
- После успеха удалить точку из локального списка.
- Если используется сортировка, после удаления можно пересчитать порядок на фронте или перезагрузить маршрут.

## Backend notes

- Используются таблицы:
  - `route_places`;
  - `routes`.
- Доступ проверяется через принадлежность маршрута пользователю.
- Удаляется только запись `route_places`.
- `routes.updated_at` в этом коде не обновляется.

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

$routePlaceId = (int) ($input['route_place_id'] ?? 0);

if ($routePlaceId <= 0) {
    errorResponse('Не передан ID точки маршрута', 400);
}

try {

    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            rp.id,
            rp.route_id
        FROM route_places rp
        INNER JOIN routes r
            ON r.id = rp.route_id
        WHERE rp.id = :id
        AND r.user_id = :user_id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $routePlaceId,
        'user_id' => $userId,
    ]);

    $routePlace = $stmt->fetch();

    if (!$routePlace) {
        errorResponse('Точка маршрута не найдена', 404);
    }

    $deleteStmt = $pdo->prepare("
        DELETE FROM route_places
        WHERE id = :id
        LIMIT 1
    ");

    $deleteStmt->execute([
        'id' => $routePlaceId,
    ]);

    successResponse([
        'message' => 'Точка удалена из маршрута',
        'route_place_id' => $routePlaceId,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось удалить точку маршрута',
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