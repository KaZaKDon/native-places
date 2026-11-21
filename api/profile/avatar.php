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
