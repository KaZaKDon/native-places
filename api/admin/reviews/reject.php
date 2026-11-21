<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';
require_once __DIR__ . '/../shared/moderator-log.php';

$adminUser = requireAdminOrModerator();

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    $input = [];
}

$reviewId = (int) ($input['id'] ?? 0);

if ($reviewId <= 0) {
    errorResponse('Не передан ID отзыва', 422);
}

try {
    $pdo = getDatabaseConnection();

    $pdo->beginTransaction();

    $stmt = $pdo->prepare("
        SELECT
            id,
            place_id,
            user_id,
            status
        FROM reviews
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $reviewId,
    ]);

    $review = $stmt->fetch();

    if (!$review) {
        $pdo->rollBack();
        errorResponse('Отзыв не найден', 404);
    }

    if ($review['status'] === 'rejected') {
        $pdo->rollBack();
        errorResponse('Отзыв уже отклонён', 422);
    }

    $updateStmt = $pdo->prepare("
        UPDATE reviews
        SET
            status = 'rejected',
            moderated_at = NOW(),
            updated_at = NOW()
        WHERE id = :id
        LIMIT 1
    ");

    $updateStmt->execute([
        'id' => $reviewId,
    ]);

    writeModeratorLog(
        (int) $adminUser['id'],
        'reject_review',
        'review',
        $reviewId,
        'Отклонён отзыв #' . $reviewId . ' к объявлению #' . (int) $review['place_id'],
        $pdo
    );

    $pdo->commit();

    successResponse([
        'message' => 'Отзыв отклонён',
        'review_id' => $reviewId,
        'status' => 'rejected',
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось отклонить отзыв', 500, [
        'error' => $e->getMessage(),
    ]);
}
