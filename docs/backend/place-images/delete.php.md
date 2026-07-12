# api/place-images/delete.php

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

Endpoint удаляет фотографию объекта текущего пользователя.

Если удаляемая фотография была обложкой, backend назначает следующую фотографию обложкой. Если других фотографий нет, `places.cover_image` очищается.

## Метод и URL

```http
POST /api/place-images/delete.php
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
    "message": "Фотография удалена",
    "image_id": 1
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `400` | `Не передан ID фотографии` | `image_id` отсутствует или меньше/равен нулю. |
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `404` | `Фотография не найдена или нет доступа` | Фотография не найдена или не относится к объекту пользователя. |
| `500` | `Не удалось удалить фотографию` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Использовать для кнопки удаления фотографии.
- После успеха удалить изображение из локального списка.
- Если удалялась обложка, нужно перезагрузить список фотографий или локально назначить следующую.
- Желательно показывать confirm modal перед удалением.

## Backend notes

- Используются таблицы:
  - `place_images`;
  - `places`.
- Файл удаляется физически через `unlink()`, если существует.
- Если удалённая фотография была обложкой:
  - выбирается следующая фотография по `sort_order ASC, id ASC`;
  - она становится новой обложкой;
  - `places.cover_image` обновляется.
- Если других фотографий нет:
  - `places.cover_image = NULL`.

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
            pi.image_path,
            pi.is_cover
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

    $deleteStmt = $pdo->prepare("
        DELETE FROM place_images
        WHERE id = :id
        LIMIT 1
    ");

    $deleteStmt->execute([
        'id' => $imageId,
    ]);

    $filePath = __DIR__ . '/../..' . $image['image_path'];

    if (is_file($filePath)) {
        unlink($filePath);
    }

    if ((int) $image['is_cover'] === 1) {
        $nextCoverStmt = $pdo->prepare("
            SELECT
                id,
                image_path
            FROM place_images
            WHERE place_id = :place_id
            ORDER BY sort_order ASC, id ASC
            LIMIT 1
        ");

        $nextCoverStmt->execute([
            'place_id' => $image['place_id'],
        ]);

        $nextCover = $nextCoverStmt->fetch();

        if ($nextCover) {
            $setCoverStmt = $pdo->prepare("
                UPDATE place_images
                SET is_cover = CASE
                    WHEN id = :image_id THEN 1
                    ELSE 0
                END
                WHERE place_id = :place_id
            ");

            $setCoverStmt->execute([
                'image_id' => $nextCover['id'],
                'place_id' => $image['place_id'],
            ]);

            $updatePlaceStmt = $pdo->prepare("
                UPDATE places
                SET cover_image = :cover_image
                WHERE id = :place_id
                LIMIT 1
            ");

            $updatePlaceStmt->execute([
                'cover_image' => $nextCover['image_path'],
                'place_id' => $image['place_id'],
            ]);
        } else {
            $clearCoverStmt = $pdo->prepare("
                UPDATE places
                SET cover_image = NULL
                WHERE id = :place_id
                LIMIT 1
            ");

            $clearCoverStmt->execute([
                'place_id' => $image['place_id'],
            ]);
        }
    }

    successResponse([
        'message' => 'Фотография удалена',
        'image_id' => $imageId,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось удалить фотографию',
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