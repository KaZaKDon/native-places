<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';
require_once __DIR__ . '/../shared/moderator-log.php';

$adminUser = requireAdmin();

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    $input = [];
}

$userId = (int) ($input['user_id'] ?? 0);

if ($userId <= 0) {
    errorResponse('Не передан ID пользователя', 422);
}

try {
    $pdo = getDatabaseConnection();

    $userStmt = $pdo->prepare("
        SELECT
            u.id,
            u.email,
            u.first_name,
            u.last_name,
            u.status,
            r.code AS role_code
        FROM users u
        INNER JOIN roles r
            ON r.id = u.role_id
        WHERE u.id = :id
        LIMIT 1
    ");

    $userStmt->execute([
        'id' => $userId,
    ]);

    $user = $userStmt->fetch();

    if (!$user) {
        errorResponse('Пользователь не найден', 404);
    }

    if ($user['status'] !== 'active') {
        errorResponse('Нельзя назначить модератором заблокированного или удалённого пользователя', 403);
    }

    if ($user['role_code'] === 'admin') {
        errorResponse('Администратора нельзя назначить модератором', 422);
    }

    if ($user['role_code'] === 'moderator') {
        successResponse([
            'message' => 'Пользователь уже является модератором',
            'user_id' => $userId,
        ]);
    }

    $roleStmt = $pdo->prepare("
        SELECT id
        FROM roles
        WHERE code = 'moderator'
        LIMIT 1
    ");

    $roleStmt->execute();

    $role = $roleStmt->fetch();

    if (!$role) {
        errorResponse('Роль moderator не найдена', 500);
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
        'id' => $userId,
        'role_id' => (int) $role['id'],
    ]);

    writeModeratorLog(
        (int) $adminUser['id'],
        'make_moderator',
        'user',
        $userId,
        'Пользователь назначен модератором: ' . ($user['email'] ?? ('#' . $userId))
    );

    successResponse([
        'message' => 'Пользователь назначен модератором',
        'user_id' => $userId,
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось назначить модератора', 500, [
        'error' => $e->getMessage(),
    ]);
}
