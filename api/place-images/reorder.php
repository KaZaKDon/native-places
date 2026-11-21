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
