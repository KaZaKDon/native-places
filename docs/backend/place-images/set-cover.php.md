# api/place-images/set-cover.php

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

Endpoint назначает фотографию обложкой объекта.

Обложкой можно сделать только фотографию объекта текущего пользователя.

## Метод и URL

```http
POST /api/place-images/set-cover.php
```

## Авторизация

Требуется user session.

## Request

Тело запроса передаётся в формате JSON.

```json
{
  "image_id": 1
}
```

## Success response

HTTP `200`

```json
{
  "success": true,
  "data": {
    "message": "Обложка успешно обновлена",
    "image_id": 1,
    "place_id": 123,
    "cover_image": "/uploads/places/place_123.jpg"
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `400` | `Не передан ID фотографии` | `image_id` отсутствует или меньше/равен нулю. |
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `404` | `Фотография не найдена или нет доступа` | Фотография не найдена или не относится к объекту пользователя. |
| `500` | `Не удалось обновить обложку` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Использовать для кнопки «Сделать обложкой».
- После успеха обновить `is_cover` в локальном списке фотографий.
- Также обновить `cover_image` объекта.

## Backend notes

- Используются таблицы:
  - `place_images`;
  - `places`.
- Сначала проверяется, что фотография принадлежит объекту текущего пользователя.
- Затем всем изображениям объекта ставится `is_cover = 0`.
- Выбранному изображению ставится `is_cover = 1`.
- В таблице `places` обновляется:
  - `cover_image`;
  - `updated_at`.

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

$imageId = (int) ($input['image_id'] ?? 0);

if ($imageId <= 0) {
    errorResponse('Не передан ID фотографии', 400);
}

try {

    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            pi.id,
            pi.place_id,
            pi.image_path
        FROM place_images pi
        INNER JOIN places p
            ON p.id = pi.place_id
        WHERE pi.id = :image_id
        AND p.user_id = :user_id
        LIMIT 1
    ");

    $stmt->execute([
        'image_id' => $imageId,
        'user_id' => $userId,
    ]);

    $image = $stmt->fetch();

    if (!$image) {
        errorResponse('Фотография не найдена или нет доступа', 404);
    }

    $resetStmt = $pdo->prepare("
        UPDATE place_images
        SET is_cover = 0
        WHERE place_id = :place_id
    ");

    $resetStmt->execute([
        'place_id' => $image['place_id'],
    ]);

    $coverStmt = $pdo->prepare("
        UPDATE place_images
        SET is_cover = 1
        WHERE id = :image_id
        LIMIT 1
    ");

    $coverStmt->execute([
        'image_id' => $imageId,
    ]);

    $placeStmt = $pdo->prepare("
        UPDATE places
        SET
            cover_image = :cover_image,
            updated_at = NOW()
        WHERE id = :place_id
        LIMIT 1
    ");

    $placeStmt->execute([
        'cover_image' => $image['image_path'],
        'place_id' => $image['place_id'],
    ]);

    successResponse([
        'message' => 'Обложка успешно обновлена',
        'image_id' => $imageId,
        'place_id' => (int) $image['place_id'],
        'cover_image' => $image['image_path'],
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось обновить обложку',
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