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
        errorResponse('Объект не найден или нет доступа', 404);
    }

    if ($place['status'] === 'expired') {
        errorResponse('Объект уже находится в архиве', 422);
    }

    $updateStmt = $pdo->prepare("
        UPDATE places
        SET
            status = 'expired',
            moderated_at = NULL,
            updated_at = NOW()
        WHERE id = :id
        AND user_id = :user_id
        LIMIT 1
    ");

    $updateStmt->execute([
        'id' => $placeId,
        'user_id' => $userId,
    ]);

    successResponse([
        'message' => 'Объект перемещён в архив',
        'place_id' => $placeId,
        'title' => $place['title'],
        'status' => 'expired',
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось переместить объект в архив', 500, [
        'error' => $e->getMessage(),
    ]);
}
