<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdmin();

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    $input = [];
}

$mailingId = (int) ($input['mailing_id'] ?? 0);

if ($mailingId <= 0) {
    errorResponse('Не передан ID рассылки', 400);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            id,
            status,
            recipients_count
        FROM mailings
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $mailingId,
    ]);

    $mailing = $stmt->fetch();

    if (!$mailing) {
        errorResponse('Рассылка не найдена', 404);
    }

    if ($mailing['status'] !== 'draft') {
        errorResponse('Запустить можно только черновик рассылки', 422);
    }

    if ((int) $mailing['recipients_count'] <= 0) {
        errorResponse('У рассылки нет получателей', 422);
    }

    $updateStmt = $pdo->prepare("
        UPDATE mailings
        SET
            status = 'sending',
            error_message = NULL
        WHERE id = :id
        LIMIT 1
    ");

    $updateStmt->execute([
        'id' => $mailingId,
    ]);

    successResponse([
        'message' => 'Рассылка запущена',
        'mailing_id' => $mailingId,
        'status' => 'sending',
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось запустить рассылку', 500, [
        'error' => $e->getMessage(),
    ]);
}
