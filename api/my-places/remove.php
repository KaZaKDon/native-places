<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    errorResponse('Некорректный JSON', 400);
}

$placeId = (int) ($input['place_id'] ?? 0);

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

try {
    $pdo = getDatabaseConnection();

    $placeStmt = $pdo->prepare("
        SELECT
            id,
            title,
            status
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
        errorResponse('Объявление не найдено или нет доступа', 404);
    }

    if ($place['status'] !== 'expired') {
        errorResponse('Удалить навсегда можно только объявление из архива', 422);
    }

    $pdo->beginTransaction();

    $pdo->prepare("DELETE FROM favorites WHERE place_id = :place_id")->execute([
        'place_id' => $placeId,
    ]);

    $pdo->prepare("DELETE FROM place_attributes WHERE place_id = :place_id")->execute([
        'place_id' => $placeId,
    ]);

    $pdo->prepare("DELETE FROM place_images WHERE place_id = :place_id")->execute([
        'place_id' => $placeId,
    ]);

    $deleteStmt = $pdo->prepare("
        DELETE FROM places
        WHERE id = :id
        AND user_id = :user_id
        AND status = 'expired'
        LIMIT 1
    ");

    $deleteStmt->execute([
        'id' => $placeId,
        'user_id' => $userId,
    ]);

    $pdo->commit();

    successResponse([
        'message' => 'Объявление удалено из архива',
        'place_id' => $placeId,
        'title' => $place['title'],
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось удалить объявление из архива', 500, [
        'error' => $e->getMessage(),
    ]);
}
