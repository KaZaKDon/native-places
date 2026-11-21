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
            status,
            payment_status
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

    if ($place['status'] === 'published') {
        $pdo->rollBack();
        errorResponse('Объявление уже опубликовано', 422);
    }

    if ($place['status'] === 'expired') {
        $pdo->rollBack();
        errorResponse('Нельзя опубликовать архивное объявление', 422);
    }

    if ($place['payment_status'] === 'unpaid') {
        $pdo->rollBack();
        errorResponse('Нельзя опубликовать неоплаченное объявление', 422);
    }

    $updateStmt = $pdo->prepare("
        UPDATE places
        SET
            status = 'published',
            published_at = COALESCE(published_at, NOW()),
            moderated_at = NOW(),
            closed_at = NULL,
            updated_at = NOW()
        WHERE id = :id
        LIMIT 1
    ");

    $updateStmt->execute([
        'id' => $placeId,
    ]);

    writeModeratorLog(
        (int) $adminUser['id'],
        'publish',
        'place',
        $placeId,
        'Опубликовано объявление: ' . ($place['title'] ?? ('#' . $placeId)),
        $pdo
    );

    $pdo->commit();

    successResponse([
        'message' => 'Объявление опубликовано',
        'place_id' => $placeId,
        'status' => 'published',
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось опубликовать объявление', 500, [
        'error' => $e->getMessage(),
    ]);
}
