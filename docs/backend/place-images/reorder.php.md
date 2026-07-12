# api/place-images/reorder.php

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

Endpoint обновляет порядок фотографий объекта текущего пользователя.

Используется после drag-and-drop сортировки фотографий на фронте.

## Метод и URL

```http
POST /api/place-images/reorder.php
```

## Авторизация

Требуется user session.

Endpoint вызывает:

```php
$userId = requireAuth();
```

Пользователь может менять порядок фотографий только у своего объекта.

## Request

Тело запроса передаётся в формате JSON.

```json
{
  "place_id": 123,
  "image_ids": [10, 11, 12]
}
```

## Request fields

| Поле | Тип | Обязательное | Правила |
|---|---|---:|---|
| `place_id` | number | да | ID объекта текущего пользователя. |
| `image_ids` | array<number> | да | Новый порядок ID фотографий. |

## Success response

HTTP `200`

```json
{
  "success": true,
  "data": {
    "message": "Порядок фотографий обновлён",
    "place_id": 123,
    "image_ids": [10, 11, 12]
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `400` | `Не передан ID объекта` | `place_id` отсутствует или меньше/равен нулю. |
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `403` | `В списке есть фотографии другого объекта` | В `image_ids` переданы фотографии, которые не принадлежат объекту. |
| `404` | `Объект не найден или нет доступа` | Объект не найден или не принадлежит пользователю. |
| `422` | `Не передан порядок фотографий` | `image_ids` не массив или пустой массив. |
| `422` | `Некорректный порядок фотографий` | После преобразования к числам список оказался пустым. |
| `500` | `Не удалось обновить порядок фотографий` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint использовать после изменения порядка фотографий.
- Передавать полный массив ID фотографий в нужном порядке.
- После успеха можно локально сохранить новый порядок.
- Если backend вернул `403`, значит в массив попала фотография чужого/другого объекта — нужно перезагрузить список.
- Для drag-and-drop лучше делать optimistic UI, но при ошибке откатывать порядок.

## Backend notes

- Используются таблицы:
  - `places`;
  - `place_images`.
- Сначала проверяется, что объект принадлежит текущему пользователю.
- Затем проверяется, что все `image_ids` относятся к этому `place_id`.
- Если количество найденных ID не совпадает с количеством переданных, backend возвращает `403`.
- Обновление `sort_order` выполняется в транзакции.
- Индекс элемента в массиве становится новым `sort_order`.

## PHP-код

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(file_get_contents('php://input'), true);

$placeId = (int) ($input['place_id'] ?? 0);
$imageIds = $input['image_ids'] ?? [];

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

if (!is_array($imageIds) || count($imageIds) === 0) {
    errorResponse('Не передан порядок фотографий', 422);
}

$imageIds = array_values(array_filter(array_map('intval', $imageIds)));

if (count($imageIds) === 0) {
    errorResponse('Некорректный порядок фотографий', 422);
}

try {
    $pdo = getDatabaseConnection();

    $placeStmt = $pdo->prepare("
        SELECT id
        FROM places
        WHERE id = :place_id
          AND user_id = :user_id
        LIMIT 1
    ");

    $placeStmt->execute([
        'place_id' => $placeId,
        'user_id' => $userId,
    ]);

    $place = $placeStmt->fetch();

    if (!$place) {
        errorResponse('Объект не найден или нет доступа', 404);
    }

    $placeholders = implode(',', array_fill(0, count($imageIds), '?'));

    $checkStmt = $pdo->prepare("
        SELECT id
        FROM place_images
        WHERE place_id = ?
          AND id IN ($placeholders)
    ");

    $checkStmt->execute([
        $placeId,
        ...$imageIds,
    ]);

    $existingIds = array_map('intval', array_column($checkStmt->fetchAll(), 'id'));

    if (count($existingIds) !== count($imageIds)) {
        errorResponse('В списке есть фотографии другого объекта', 403);
    }

    $pdo->beginTransaction();

    $updateStmt = $pdo->prepare("
        UPDATE place_images
        SET sort_order = :sort_order
        WHERE id = :image_id
          AND place_id = :place_id
        LIMIT 1
    ");

    foreach ($imageIds as $index => $imageId) {
        $updateStmt->execute([
            'sort_order' => $index,
            'image_id' => $imageId,
            'place_id' => $placeId,
        ]);
    }

    $pdo->commit();

    successResponse([
        'message' => 'Порядок фотографий обновлён',
        'place_id' => $placeId,
        'image_ids' => $imageIds,
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось обновить порядок фотографий', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Документ структурирован из `docs/API_FULL_TEXT.md`. |