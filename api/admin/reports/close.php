<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';
require_once __DIR__ . '/../shared/moderator-log.php';

$adminUser = requireAdminOrModerator();

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    $input = [];
}

$reportId = (int) ($input['id'] ?? 0);

if ($reportId <= 0) {
    errorResponse('Не передан ID жалобы', 422);
}

try {
    $pdo = getDatabaseConnection();

    $pdo->beginTransaction();

    $stmt = $pdo->prepare("
        SELECT
            id,
            place_id,
            user_id,
            report_type,
            status
        FROM reports
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $reportId,
    ]);

    $report = $stmt->fetch();

    if (!$report) {
        $pdo->rollBack();
        errorResponse('Жалоба не найдена', 404);
    }

    if ($report['status'] === 'resolved') {
        $pdo->rollBack();
        errorResponse('Жалоба уже решена', 422);
    }

    if ($report['status'] === 'rejected') {
        $pdo->rollBack();
        errorResponse('Отклонённую жалобу нельзя закрыть как решённую', 422);
    }

    $updateStmt = $pdo->prepare("
        UPDATE reports
        SET
            status = 'resolved',
            resolved_at = NOW(),
            updated_at = NOW()
        WHERE id = :id
        LIMIT 1
    ");

    $updateStmt->execute([
        'id' => $reportId,
    ]);

    writeModeratorLog(
        (int) $adminUser['id'],
        'resolve_report',
        'report',
        $reportId,
        'Жалоба решена: #' . $reportId . ', тип: ' . ($report['report_type'] ?? '—'),
        $pdo
    );

    $pdo->commit();

    successResponse([
        'message' => 'Жалоба закрыта',
        'report_id' => $reportId,
        'status' => 'resolved',
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось закрыть жалобу', 500, [
        'error' => $e->getMessage(),
    ]);
}
