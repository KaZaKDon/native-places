# api/place-images/index.php

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

Endpoint возвращает фотографии объекта текущего пользователя.

## Метод и URL

```http
GET /api/place-images/index.php?place_id={id}
```

## Авторизация

Требуется user session.

Пользователь может получить фотографии только своего объекта.

## Query params

| Параметр | Тип | Обязательный | Описание |
|---|---|---:|---|
| `place_id` | number | да | ID объекта текущего пользователя. |

## Success response

HTTP `200`

```json
{
  "success": true,
  "data": {
    "place_id": 123,
    "images": [
      {
        "id": 1,
        "image_path": "/uploads/places/place_123.jpg",
        "sort_order": 0,
        "is_cover": 1,
        "created_at": "2026-07-04 10:00:00"
      }
    ]
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `400` | `Не передан ID объекта` | `place_id` отсутствует или меньше/равен нулю. |
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `404` | `Объект не найден или нет доступа` | Объект не найден или не принадлежит пользователю. |
| `500` | `Не удалось получить фотографии` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Использовать для блока управления фотографиями объекта.
- Фотографии уже отсортированы.
- Для обложки смотреть `is_cover`.
- Если `images` пустой, показать состояние «фотографий нет».

## Backend notes

- Используются таблицы:
  - `places`;
  - `place_images`.
- Сначала проверяется доступ к объекту.
- Фотографии сортируются по:
  - `sort_order ASC`;
  - `id ASC`.

## PHP-код

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$placeId = (int) ($_GET['place_id'] ?? 0);

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

try {

    $pdo = getDatabaseConnection();

    $placeStmt = $pdo->prepare("
        SELECT id
        FROM places
        WHERE id = :id
        AND user_id = :user_id
        LIMIT 1
    ");

    $placeStmt->execute([
        'id' => $placeId,
        'user_id' => $userId,
    ]);

    $place = $placeStmt->fetch();

    if (!$place) {
        errorResponse('Объект не найден или нет доступа', 404);
    }

    $imagesStmt = $pdo->prepare("
        SELECT
            id,
            image_path,
            sort_order,
            is_cover,
            created_at
        FROM place_images
        WHERE place_id = :place_id
        ORDER BY sort_order ASC, id ASC
    ");

    $imagesStmt->execute([
        'place_id' => $placeId,
    ]);

    $images = $imagesStmt->fetchAll();

    successResponse([
        'place_id' => $placeId,
        'images' => $images,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось получить фотографии',
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