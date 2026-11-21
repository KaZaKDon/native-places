<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

$currentAdmin = requireAdmin();

$input = json_decode(file_get_contents('php://input'), true);

$userId = (int) ($input['id'] ?? 0);
$status = trim($input['status'] ?? '');

$allowedStatuses = ['active', 'blocked', 'deleted'];

if ($userId <= 0) {
    errorResponse('Не передан ID пользователя', 422);
}

if (!in_array($status, $allowedStatuses, true)) {
    errorResponse('Некорректный статус пользователя', 422);
}

if ((int) $currentAdmin['id'] === $userId && $status !== 'active') {
    errorResponse('Нельзя заблокировать или удалить текущий аккаунт администратора', 422);
}

try {
    $pdo = getDatabaseConnection();

    $userStmt = $pdo->prepare("
        SELECT id
        FROM users
        WHERE id = :id
        LIMIT 1
    ");

    $userStmt->execute([
        'id' => $userId,
    ]);

    $user = $userStmt->fetch();

    if (!$user) {
        errorResponse('Пользователь не найден', 404);
    }

    $updateStmt = $pdo->prepare("
        UPDATE users
        SET
            status = :status,
            updated_at = NOW()
        WHERE id = :id
        LIMIT 1
    ");

    $updateStmt->execute([
        'status' => $status,
        'id' => $userId,
    ]);

    successResponse([
        'message' => 'Статус пользователя обновлён',
        'user_id' => $userId,
        'status' => $status,
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось обновить статус пользователя', 500, [
        'error' => $e->getMessage(),
    ]);
}
