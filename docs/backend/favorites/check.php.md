# api/favorites/check.php

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

Endpoint проверяет, находится ли объект в избранном у текущего пользователя.

Особенность: endpoint не требует обязательной авторизации. Если пользователь не авторизован, он возвращает:

```json
{
  "is_favorite": false
}
```

## Метод и URL

```http
GET /api/favorites/check.php?place_id={id}
```

## Авторизация

Не обязательна.

Endpoint использует:

```php
$userId = getCurrentUserId();
```

Если пользователя нет в сессии, возвращает `is_favorite = false`.

## Query params

| Параметр | Тип | Обязательный | Описание |
|---|---|---:|---|
| `place_id` | number | да | ID объекта. |

## Success response

### Пользователь авторизован и объект в избранном

HTTP `200`

```json
{
  "success": true,
  "data": {
    "is_favorite": true
  }
}
```

### Пользователь не авторизован или объект не в избранном

HTTP `200`

```json
{
  "success": true,
  "data": {
    "is_favorite": false
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `400` | `Не передан ID объекта` | `place_id` отсутствует или меньше/равен нулю. |
| `500` | `Не удалось проверить избранное` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint удобно использовать на публичной карточке объекта.
- Его можно вызывать даже если пользователь не авторизован.
- Если `is_favorite = false`, это может означать:
  - пользователь не авторизован;
  - объект не добавлен в избранное.
- Для добавления/удаления использовать `api/favorites/toggle.php`, который уже требует авторизацию.

## Backend notes

- Используется таблица `favorites`.
- Если пользователя нет в сессии, запрос к базе не выполняется.
- Проверяется наличие записи по:
  - `user_id`;
  - `place_id`.

## PHP-код

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = getCurrentUserId();

$placeId = (int) ($_GET['place_id'] ?? 0);

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

if (!$userId) {
    successResponse([
        'is_favorite' => false,
    ]);
}

try {

    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT id
        FROM favorites
        WHERE user_id = :user_id
        AND place_id = :place_id
        LIMIT 1
    ");

    $stmt->execute([
        'user_id' => $userId,
        'place_id' => $placeId,
    ]);

    $favorite = $stmt->fetch();

    successResponse([
        'is_favorite' => (bool) $favorite,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось проверить избранное',
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