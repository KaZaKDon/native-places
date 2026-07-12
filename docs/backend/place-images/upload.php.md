# api/place-images/upload.php

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

Endpoint загружает фотографию для объекта текущего пользователя.

Если это первая фотография объекта, она автоматически становится обложкой.

## Метод и URL

```http
POST /api/place-images/upload.php
```

## Авторизация

Требуется user session.

Endpoint вызывает:

```php
$userId = requireAuth();
```

Пользователь может загружать изображения только к своим объектам.

## Request

Запрос отправляется как `multipart/form-data`.

| Поле | Тип | Обязательное | Описание |
|---|---|---:|---|
| `place_id` | number/string | да | ID объекта текущего пользователя. |
| `image` | file | да | Файл изображения. |

## File validation

| Проверка | Правило |
|---|---|
| MIME type | `image/jpeg`, `image/png`, `image/webp`. |
| Максимальный размер | 5 МБ. |
| Максимум фотографий | 15 фотографий на объект. |

## Success response

HTTP `201`

```json
{
  "success": true,
  "data": {
    "message": "Фотография успешно загружена",
    "image": {
      "id": 1,
      "place_id": 123,
      "image_path": "/uploads/places/place_123_1234567890_abcd1234.jpg",
      "sort_order": 0,
      "is_cover": true
    }
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `400` | `Не передан ID объекта` | `place_id` отсутствует или меньше/равен нулю. |
| `400` | `Файл изображения не передан` | В `$_FILES` нет поля `image`. |
| `400` | `Ошибка загрузки файла` | PHP upload error. |
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `404` | `Объект не найден или нет доступа` | Объект не найден или не принадлежит пользователю. |
| `422` | `Разрешены только изображения JPG, PNG или WEBP` | MIME type не разрешён. |
| `422` | `Размер файла не должен превышать 5 МБ` | Файл больше 5 МБ. |
| `422` | `Можно загрузить не больше 15 фотографий` | У объекта уже 15 фотографий. |
| `500` | `Не удалось сохранить файл` | Файл не удалось переместить в uploads. |
| `500` | `Не удалось загрузить фотографию` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Использовать `FormData`.
- Не устанавливать `Content-Type` вручную.
- Передавать `place_id` и файл `image`.
- После успешной загрузки добавить `image` в локальный список фотографий.
- Если `is_cover = true`, обновить обложку объекта.
- При `422` показать пользователю ограничение по типу, размеру или количеству фотографий.

## Backend notes

- Используются таблицы:
  - `places`;
  - `place_images`.
- Файл сохраняется в:
  - `/uploads/places`.
- Публичный путь сохраняется как:
  - `/uploads/places/{fileName}`.
- Имя файла формируется как:
  - `place_{placeId}_{time}_{random}.{extension}`.
- Если изображение первое, оно получает:
  - `is_cover = 1`;
  - `sort_order = 0`;
  - `places.cover_image = publicPath`.

## PHP-код

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$placeId = (int) ($_POST['place_id'] ?? 0);

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

if (empty($_FILES['image'])) {
    errorResponse('Файл изображения не передан', 400);
}

$file = $_FILES['image'];

if ($file['error'] !== UPLOAD_ERR_OK) {
    errorResponse('Ошибка загрузки файла', 400);
}

$allowedTypes = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
];

$mimeType = mime_content_type($file['tmp_name']);

if (!isset($allowedTypes[$mimeType])) {
    errorResponse('Разрешены только изображения JPG, PNG или WEBP', 422);
}

$maxSize = 5 * 1024 * 1024;

if ($file['size'] > $maxSize) {
    errorResponse('Размер файла не должен превышать 5 МБ', 422);
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

    $countStmt = $pdo->prepare("
        SELECT COUNT(*) AS total
        FROM place_images
        WHERE place_id = :place_id
    ");

    $countStmt->execute([
        'place_id' => $placeId,
    ]);

    $imagesCount = (int) $countStmt->fetch()['total'];

    if ($imagesCount >= 15) {
        errorResponse('Можно загрузить не больше 15 фотографий', 422);
    }

    $extension = $allowedTypes[$mimeType];

    $uploadDir = __DIR__ . '/../../uploads/places';

    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $fileName = 'place_' . $placeId . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $extension;
    $filePath = $uploadDir . '/' . $fileName;

    if (!move_uploaded_file($file['tmp_name'], $filePath)) {
        errorResponse('Не удалось сохранить файл', 500);
    }

    $publicPath = '/uploads/places/' . $fileName;

    $isCover = $imagesCount === 0 ? 1 : 0;
    $sortOrder = $imagesCount;

    $insertStmt = $pdo->prepare("
        INSERT INTO place_images (
            place_id,
            image_path,
            sort_order,
            is_cover
        ) VALUES (
            :place_id,
            :image_path,
            :sort_order,
            :is_cover
        )
    ");

    $insertStmt->execute([
        'place_id' => $placeId,
        'image_path' => $publicPath,
        'sort_order' => $sortOrder,
        'is_cover' => $isCover,
    ]);

    $imageId = (int) $pdo->lastInsertId();

    if ($isCover === 1) {
        $coverStmt = $pdo->prepare("
            UPDATE places
            SET cover_image = :cover_image
            WHERE id = :id
            LIMIT 1
        ");

        $coverStmt->execute([
            'cover_image' => $publicPath,
            'id' => $placeId,
        ]);
    }

    successResponse([
        'message' => 'Фотография успешно загружена',
        'image' => [
            'id' => $imageId,
            'place_id' => $placeId,
            'image_path' => $publicPath,
            'sort_order' => $sortOrder,
            'is_cover' => (bool) $isCover,
        ],
    ], 201);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось загрузить фотографию',
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