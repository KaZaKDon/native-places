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
$comment = trim((string) ($input['comment'] ?? ''));

if ($placeId <= 0) {
    errorResponse('Не передан ID объявления', 422);
}

if ($comment === '') {
    errorResponse('Укажите причину отклонения объявления', 422);
}

if (mb_strlen($comment, 'UTF-8') > 1000) {
    errorResponse('Комментарий модератора слишком длинный', 422);
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

    if ($place['status'] === 'rejected') {
        $pdo->rollBack();
        errorResponse('Объявление уже отклонено', 422);
    }

    if ($place['status'] === 'expired') {
        $pdo->rollBack();
        errorResponse('Нельзя отклонить архивное объявление', 422);
    }

    $updateStmt = $pdo->prepare("
        UPDATE places
        SET
            status = 'rejected',
            moderated_at = NOW(),
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
        'reject',
        'place',
        $placeId,
        'Отклонено объявление: ' . ($place['title'] ?? ('#' . $placeId)) . '. Причина: ' . $comment,
        $pdo
    );

    $pdo->commit();

    successResponse([
        'message' => 'Объявление отклонено',
        'place_id' => $placeId,
        'status' => 'rejected',
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось отклонить объявление', 500, [
        'error' => $e->getMessage(),
    ]);
}
