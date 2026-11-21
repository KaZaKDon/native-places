<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../../shared/response.php';
require_once __DIR__ . '/../../config/database.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$input = json_decode(
    file_get_contents('php://input'),
    true
);

if (!is_array($input)) {
    $input = [];
}

$code = trim($input['code'] ?? '');

if ($code === '') {
    errorResponse('Введите код доступа', 422);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            id,
            user_id,
            role_code,
            display_name,
            code_hash,
            status,
            expires_at
        FROM admin_access_codes
        WHERE status = 'active'
        ORDER BY id ASC
    ");

    $stmt->execute();

    $accessItems = $stmt->fetchAll();

    $matchedAccess = null;

    foreach ($accessItems as $item) {
        if (password_verify($code, $item['code_hash'])) {
            $matchedAccess = $item;
            break;
        }
    }

    if (!$matchedAccess) {
        errorResponse('Неверный код доступа', 401);
    }

    if (!empty($matchedAccess['expires_at'])) {
        $expiresAt = strtotime($matchedAccess['expires_at']);

        if ($expiresAt !== false && $expiresAt < time()) {
            $disableStmt = $pdo->prepare("
                UPDATE admin_access_codes
                SET status = 'disabled'
                WHERE id = :id
                LIMIT 1
            ");

            $disableStmt->execute([
                'id' => (int) $matchedAccess['id'],
            ]);

            errorResponse('Срок действия кода истёк', 403);
        }
    }

    $userId = (int) ($matchedAccess['user_id'] ?? 0);

    if ($userId <= 0) {
        errorResponse('Код доступа не привязан к пользователю', 422);
    }

    $userStmt = $pdo->prepare("
        SELECT
            u.id,
            u.email,
            u.first_name,
            u.last_name,
            u.status,
            r.code AS role_code,
            r.title AS role_title
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
        errorResponse('Пользователь для кода доступа не найден', 404);
    }

    if ($user['status'] !== 'active') {
        errorResponse('Пользователь заблокирован или удалён', 403);
    }

    if ($user['role_code'] !== 'moderator') {
        errorResponse('Пользователь больше не является модератором', 403);
    }

    $updateStmt = $pdo->prepare("
        UPDATE admin_access_codes
        SET last_login_at = NOW()
        WHERE id = :id
        LIMIT 1
    ");

    $updateStmt->execute([
        'id' => (int) $matchedAccess['id'],
    ]);

    session_regenerate_id(true);

    $displayName = trim((string) ($matchedAccess['display_name'] ?? ''));

    if ($displayName === '') {
        $displayName = trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? ''));
    }

    if ($displayName === '') {
        $displayName = $user['email'];
    }

    $_SESSION['admin_user'] = [
        'id' => (int) $user['id'],
        'access_code_id' => (int) $matchedAccess['id'],
        'email' => $user['email'],
        'name' => $displayName,
        'role_code' => $user['role_code'],
        'role_title' => $user['role_title'],
        'access_type' => 'code',
    ];

    successResponse([
        'message' => 'Вход по коду выполнен',
        'authenticated' => true,
        'user' => $_SESSION['admin_user'],
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось выполнить вход по коду', 500, [
        'error' => $e->getMessage(),
    ]);
}
