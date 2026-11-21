<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

$currentAdmin = requireAdmin();

$input = json_decode(file_get_contents('php://input'), true);

$userId = (int) ($input['id'] ?? 0);
$roleCode = trim($input['role_code'] ?? '');

if ($userId <= 0) {
    errorResponse('Не передан ID пользователя', 422);
}

if ($roleCode === '') {
    errorResponse('Не передана роль пользователя', 422);
}

try {
    $pdo = getDatabaseConnection();

    $roleStmt = $pdo->prepare("
        SELECT id, code, title
        FROM roles
        WHERE code = :code
        LIMIT 1
    ");

    $roleStmt->execute([
        'code' => $roleCode,
    ]);

    $role = $roleStmt->fetch();

    if (!$role) {
        errorResponse('Роль не найдена', 404);
    }

    $userStmt = $pdo->prepare("
        SELECT id, role_id
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

    if ((int) $currentAdmin['id'] === $userId && $roleCode !== 'admin') {
        errorResponse('Нельзя снять роль администратора с текущего аккаунта', 422);
    }

    $updateStmt = $pdo->prepare("
        UPDATE users
        SET
            role_id = :role_id,
            updated_at = NOW()
        WHERE id = :id
        LIMIT 1
    ");

    $updateStmt->execute([
        'role_id' => (int) $role['id'],
        'id' => $userId,
    ]);

    successResponse([
        'message' => 'Роль пользователя обновлена',
        'user_id' => $userId,
        'role' => [
            'id' => (int) $role['id'],
            'code' => $role['code'],
            'title' => $role['title'],
        ],
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось обновить роль пользователя', 500, [
        'error' => $e->getMessage(),
    ]);
}
