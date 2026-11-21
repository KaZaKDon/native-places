<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdmin();

$input = json_decode(
    file_get_contents('php://input'),
    true
);

$mailingId = (int) ($input['mailing_id'] ?? 0);

if ($mailingId <= 0) {
    errorResponse('Не указан идентификатор рассылки', 422);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            id,
            status
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
        errorResponse(
            'Удалять можно только черновики',
            422
        );
    }

    $deleteStmt = $pdo->prepare("
        DELETE FROM mailings
        WHERE id = :id
        LIMIT 1
    ");

    $deleteStmt->execute([
        'id' => $mailingId,
    ]);

    successResponse([
        'message' => 'Черновик удалён',
    ]);
} catch (Throwable $e) {
    errorResponse(
        'Не удалось удалить рассылку',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );
}
