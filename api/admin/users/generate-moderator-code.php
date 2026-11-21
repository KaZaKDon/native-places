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
$expiresDays = (int) ($input['expires_days'] ?? 30);

if ($userId <= 0) {
    errorResponse('Не передан ID пользователя', 422);
}

if ($expiresDays <= 0) {
    $expiresDays = 30;
}

if ($expiresDays > 365) {
    $expiresDays = 365;
}

try {
    $pdo = getDatabaseConnection();

    $pdo->beginTransaction();

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
        $pdo->rollBack();
        errorResponse('Пользователь не найден', 404);
    }

    if ($user['status'] !== 'active') {
        $pdo->rollBack();
        errorResponse('Нельзя создать код для заблокированного или удалённого пользователя', 403);
    }

    if (($user['role_code'] ?? '') !== 'moderator') {
        $pdo->rollBack();
        errorResponse('Сначала назначьте пользователя модератором', 422);
    }

    $disableStmt = $pdo->prepare("
        UPDATE admin_access_codes
        SET status = 'disabled'
        WHERE user_id = :user_id
        AND status = 'active'
    ");

    $disableStmt->execute([
        'user_id' => $userId,
    ]);

    $plainCode = 'NP-' . strtoupper(bin2hex(random_bytes(4))) . '-' . strtoupper(bin2hex(random_bytes(4)));
    $codeHash = password_hash($plainCode, PASSWORD_DEFAULT);

    $displayName = trim(
        ($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? '')
    );

    if ($displayName === '') {
        $displayName = $user['email'] ?? ('Модератор #' . $userId);
    }

    $expiresAt = (new DateTimeImmutable())
        ->modify('+' . $expiresDays . ' days')
        ->format('Y-m-d H:i:s');

    $insertStmt = $pdo->prepare("
        INSERT INTO admin_access_codes (
            user_id,
            role_code,
            display_name,
            code_hash,
            status,
            expires_at,
            last_login_at,
            created_at
        ) VALUES (
            :user_id,
            'moderator',
            :display_name,
            :code_hash,
            'active',
            :expires_at,
            NULL,
            NOW()
        )
    ");

    $insertStmt->execute([
        'user_id' => $userId,
        'display_name' => $displayName,
        'code_hash' => $codeHash,
        'expires_at' => $expiresAt,
    ]);

    writeModeratorLog(
        (int) $adminUser['id'],
        'generate_moderator_code',
        'user',
        $userId,
        'Создан новый код входа модератора для пользователя: ' . ($user['email'] ?? ('#' . $userId))
    );

    $pdo->commit();

    successResponse([
        'message' => 'Код модератора создан',
        'user_id' => $userId,
        'access_code' => $plainCode,
        'expires_days' => $expiresDays,
        'expires_at' => $expiresAt,
    ], 201);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось создать код модератора', 500, [
        'error' => $e->getMessage(),
    ]);
}
