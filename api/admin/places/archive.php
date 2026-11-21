<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';
require_once __DIR__ . '/../shared/moderator-log.php';

$adminUser = requireAdminOrModerator();

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    $input = [];
}

$placeId = (int) ($input['id'] ?? 0);

if ($placeId <= 0) {
    errorResponse('Не передан ID объявления', 422);
}

try {
    $pdo = getDatabaseConnection();

    $pdo->beginTransaction();

    $stmt = $pdo->prepare("
        SELECT
            id,
            title,
            status
        FROM places
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $placeId,
    ]);

    $place = $stmt->fetch();

    if (!$place) {
        $pdo->rollBack();
        errorResponse('Объявление не найдено', 404);
    }

    if ($place['status'] === 'expired') {
        $pdo->rollBack();
        errorResponse('Объявление уже в архиве', 422);
    }

    $updateStmt = $pdo->prepare("
        UPDATE places
        SET
            status = 'expired',
            closed_at = NOW(),
            updated_at = NOW()
        WHERE id = :id
        LIMIT 1
    ");

    $updateStmt->execute([
        'id' => $placeId,
    ]);

    writeModeratorLog(
        (int) $adminUser['id'],
        'archive',
        'place',
        $placeId,
        'Объявление снято с публикации: ' . ($place['title'] ?? ('#' . $placeId)),
        $pdo
    );

    $pdo->commit();

    successResponse([
        'message' => 'Объявление перемещено в архив',
        'place_id' => $placeId,
        'status' => 'expired',
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось переместить объявление в архив', 500, [
        'error' => $e->getMessage(),
    ]);
}
