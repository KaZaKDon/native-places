# api/profile/avatar.php

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

Endpoint загружает и обновляет аватар текущего авторизованного пользователя.

Файл сохраняется в:

```text
/uploads/avatars
```

А путь к файлу записывается в поле:

```text
users.avatar
```

## Метод и URL

```http
POST /api/profile/avatar.php
```

## Авторизация

Требуется user session.

Endpoint вызывает:

```php
$userId = requireAuth();
```

Если пользователь не авторизован, backend должен вернуть `401`.

## Request

Запрос отправляется как `multipart/form-data`.

Поле файла:

| Поле | Тип | Обязательное | Описание |
|---|---|---:|---|
| `avatar` | file | да | Изображение JPG, PNG или WEBP. |

## File validation

| Проверка | Правило |
|---|---|
| MIME type | `image/jpeg`, `image/png`, `image/webp`. |
| Максимальный размер | 3 МБ. |

## Success response

HTTP `200`

```json
{
  "success": true,
  "data": {
    "message": "Аватар успешно обновлён",
    "avatar": "/uploads/avatars/user_1_1234567890.jpg"
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `400` | `Файл аватара не передан` | В `$_FILES` нет поля `avatar`. |
| `400` | `Ошибка загрузки файла` | PHP upload error. |
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `422` | `Разрешены только изображения JPG, PNG или WEBP` | MIME type не входит в список разрешённых. |
| `422` | `Размер файла не должен превышать 3 МБ` | Файл больше 3 МБ. |
| `500` | `Не удалось сохранить файл` | `move_uploaded_file()` не смог сохранить файл. |
| `500` | `Не удалось обновить аватар` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint используется для загрузки аватара в профиле.
- Отправлять нужно `FormData`.
- Пример:

```ts
const formData = new FormData();
formData.append('avatar', file);

await fetch('/api/profile/avatar.php', {
  method: 'POST',
  credentials: 'include',
  body: formData,
});
```

- Не нужно вручную ставить `Content-Type`, браузер сам поставит boundary для `multipart/form-data`.
- После успеха обновить аватар пользователя в auth/profile store.
- Если `avatar` вернулся относительным путём, frontend должен корректно собрать URL к изображению.

## Backend notes

- Используется таблица `users`.
- Разрешённые MIME types:
  - `image/jpeg`;
  - `image/png`;
  - `image/webp`.
- Максимальный размер:
  - `3 * 1024 * 1024`.
- Если директории `/uploads/avatars` нет, backend создаёт её с правами `0755`.
- Имя файла формируется так:

```text
user_{userId}_{time}.{extension}
```

- Старые avatar-файлы этим кодом не удаляются.

## PHP-код

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

if (empty($_FILES['avatar'])) {
    errorResponse('Файл аватара не передан', 400);
}

$file = $_FILES['avatar'];

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

$maxSize = 3 * 1024 * 1024;

if ($file['size'] > $maxSize) {
    errorResponse('Размер файла не должен превышать 3 МБ', 422);
}

$extension = $allowedTypes[$mimeType];

$uploadDir = __DIR__ . '/../../uploads/avatars';

if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$fileName = 'user_' . $userId . '_' . time() . '.' . $extension;
$filePath = $uploadDir . '/' . $fileName;

if (!move_uploaded_file($file['tmp_name'], $filePath)) {
    errorResponse('Не удалось сохранить файл', 500);
}

$publicPath = '/uploads/avatars/' . $fileName;

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        UPDATE users
        SET
            avatar = :avatar,
            updated_at = NOW()
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'avatar' => $publicPath,
        'id' => $userId,
    ]);

    successResponse([
        'message' => 'Аватар успешно обновлён',
        'avatar' => $publicPath,
    ]);

} catch (Throwable $e) {
    errorResponse('Не удалось обновить аватар', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Документ структурирован из `docs/API_FULL_TEXT.md`. |