<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';
require_once __DIR__ . '/../shared/moderator-log.php';

$adminUser = requireAdminOrModerator();

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    $input = [];
}

$appealId = (int) ($input['id'] ?? 0);
$status = trim((string) ($input['status'] ?? ''));
$adminResponse = trim((string) ($input['admin_response'] ?? ''));

$allowedStatuses = [
    'new',
    'in_work',
    'closed',
];

if ($appealId <= 0) {
    errorResponse('Не передан ID обращения', 422);
}

if (!in_array($status, $allowedStatuses, true)) {
    errorResponse('Некорректный статус обращения', 422);
}

if (mb_strlen($adminResponse, 'UTF-8') > 5000) {
    errorResponse('Ответ администрации слишком длинный', 422);
}

try {
    $pdo = getDatabaseConnection();

    $pdo->beginTransaction();

    $stmt = $pdo->prepare("
        SELECT
            id,
            user_id,
            appeal_type,
            status
        FROM appeals
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $appealId,
    ]);

    $appeal = $stmt->fetch();

    if (!$appeal) {
        $pdo->rollBack();
        errorResponse('Обращение не найдено', 404);
    }

    $updateStmt = $pdo->prepare("
        UPDATE appeals
        SET
            status = :status,
            admin_response = :admin_response,
            updated_at = NOW(),
            closed_at = CASE
                WHEN :closed_status_check = 'closed' THEN NOW()
                ELSE NULL
            END
        WHERE id = :id
        LIMIT 1
    ");

    $updateStmt->execute([
        'status' => $status,
        'admin_response' => $adminResponse !== '' ? $adminResponse : null,
        'closed_status_check' => $status,
        'id' => $appealId,
    ]);

    writeModeratorLog(
        (int) $adminUser['id'],
        'update_appeal',
        'appeal',
        $appealId,
        'Обновлено обращение #' . $appealId . ': статус ' . $appeal['status'] . ' → ' . $status,
        $pdo
    );

    $pdo->commit();

    successResponse([
        'message' => 'Обращение обновлено',
        'appeal_id' => $appealId,
        'status' => $status,
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось обновить обращение', 500, [
        'error' => $e->getMessage(),
    ]);
}
