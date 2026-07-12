# api/favorites/toggle.php

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

Endpoint переключает объект в избранном текущего пользователя.

Если объект уже есть в избранном — удаляет его.

Если объекта нет в избранном — добавляет его.

## Метод и URL

```http
POST /api/favorites/toggle.php
```

## Авторизация

Требуется user session.

Endpoint вызывает:

```php
$userId = requireAuth();
```

Если пользователь не авторизован, backend должен вернуть `401`.

## Request

Тело запроса передаётся в формате JSON.

```json
{
  "place_id": 123
}
```

## Request fields

| Поле | Тип | Обязательное | Правила |
|---|---|---:|---|
| `place_id` | number | да | ID опубликованного объекта. |

## Success response

### Добавлено в избранное

HTTP `200`

```json
{
  "success": true,
  "data": {
    "message": "Объект добавлен в избранное",
    "place_id": 123,
    "is_favorite": true,
    "action": "added"
  }
}
```

### Удалено из избранного

HTTP `200`

```json
{
  "success": true,
  "data": {
    "message": "Объект удалён из избранного",
    "place_id": 123,
    "is_favorite": false,
    "action": "removed"
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `400` | `Не передан ID объекта` | `place_id` отсутствует или меньше/равен нулю. |
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `404` | `Объект не найден` | Опубликованный объект с таким ID не найден. |
| `500` | `Не удалось изменить избранное` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint используется для кнопки «В избранное» / «Убрать из избранного».
- После ответа нужно обновить локальное состояние карточки по `is_favorite`.
- `action` удобно использовать для аналитики или toast-сообщения.
- Если пользователь не авторизован, перед toggle нужно показать login.
- При `404` объект больше недоступен или не опубликован.

## Backend notes

- Используются таблицы:
  - `places`;
  - `favorites`.
- Перед добавлением проверяется, что объект существует и опубликован:
  - `places.status = 'published'`.
- Если запись уже есть, она удаляется.
- Если записи нет, она создаётся.
- При параллельных запросах возможны дубликаты, если в базе нет уникального индекса на:
  - `(user_id, place_id)`.

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

$placeId = (int) ($input['place_id'] ?? 0);

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

try {
    $pdo = getDatabaseConnection();

    $placeStmt = $pdo->prepare("
        SELECT id
        FROM places
        WHERE id = :id
        AND status = 'published'
        LIMIT 1
    ");

    $placeStmt->execute([
        'id' => $placeId,
    ]);

    $place = $placeStmt->fetch();

    if (!$place) {
        errorResponse('Объект не найден', 404);
    }

    $favoriteStmt = $pdo->prepare("
        SELECT id
        FROM favorites
        WHERE user_id = :user_id
        AND place_id = :place_id
        LIMIT 1
    ");

    $favoriteStmt->execute([
        'user_id' => $userId,
        'place_id' => $placeId,
    ]);

    $favorite = $favoriteStmt->fetch();

    if ($favorite) {
        $deleteStmt = $pdo->prepare("
            DELETE FROM favorites
            WHERE id = :id
            LIMIT 1
        ");

        $deleteStmt->execute([
            'id' => $favorite['id'],
        ]);

        successResponse([
            'message' => 'Объект удалён из избранного',
            'place_id' => $placeId,
            'is_favorite' => false,
            'action' => 'removed',
        ]);
    }

    $insertStmt = $pdo->prepare("
        INSERT INTO favorites (
            user_id,
            place_id
        ) VALUES (
            :user_id,
            :place_id
        )
    ");

    $insertStmt->execute([
        'user_id' => $userId,
        'place_id' => $placeId,
    ]);

    successResponse([
        'message' => 'Объект добавлен в избранное',
        'place_id' => $placeId,
        'is_favorite' => true,
        'action' => 'added',
    ]);

} catch (Throwable $e) {
    errorResponse('Не удалось изменить избранное', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Документ структурирован из `docs/API_FULL_TEXT.md`. |