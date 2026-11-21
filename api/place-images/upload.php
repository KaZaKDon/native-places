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
