<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdmin();

$input = json_decode(file_get_contents('php://input'), true);

$accessCodeId = (int) ($input['id'] ?? 0);

if ($accessCodeId <= 0) {
    errorResponse('Не указан ID кода доступа', 422);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT id, status
        FROM admin_access_codes
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $accessCodeId,
    ]);

    $accessCode = $stmt->fetch();

    if (!$accessCode) {
        errorResponse('Код доступа не найден', 404);
    }

    if ($accessCode['status'] === 'disabled') {
        errorResponse('Код доступа уже отключён', 422);
    }

    $updateStmt = $pdo->prepare("
        UPDATE admin_access_codes
        SET status = 'disabled'
        WHERE id = :id
        LIMIT 1
    ");

    $updateStmt->execute([
        'id' => $accessCodeId,
    ]);

    successResponse([
        'message' => 'Код доступа отключён',
        'id' => $accessCodeId,
        'status' => 'disabled',
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось отключить код доступа', 500, [
        'error' => $e->getMessage(),
    ]);
}
