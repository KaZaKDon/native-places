<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/request.php';
require_once __DIR__ . '/../shared/session.php';
require_once __DIR__ . '/../config/database.php';

try {
    requireHttpMethod('POST');
    startAppSession();
    $input = readJsonBody();
    $email = mb_strtolower(trim((string) ($input['email'] ?? '')));
    $password = (string) ($input['password'] ?? '');
    $errors = [];

    if ($email === '') {
        $errors['email'] = 'Введите email';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors['email'] = 'Некорректный email';
    }

    if ($password === '') {
        $errors['password'] = 'Введите пароль';
    }

    if ($errors !== []) {
        errorResponse('Ошибка валидации', 422, [
            'errors' => $errors,
        ]);
    }

    $pdo = getDatabaseConnection();
    $stmt = $pdo->prepare("
        SELECT
            u.id,
            u.role_id,
            u.email,
            u.password_hash,
            u.first_name,
            u.last_name,
            u.phone,
            u.telegram,
            u.avatar,
            u.status,
            u.is_email_verified,
            u.email_verified_at,
            r.code AS role_code,
            r.title AS role_title
        FROM users u
        INNER JOIN roles r ON r.id = u.role_id
        WHERE u.email = :email
        LIMIT 1
    ");

    $stmt->execute([
        'email' => $email,
    ]);

    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        errorResponse('Неверный email или пароль', 401);
    }

    if ($user['status'] !== 'active') {
        errorResponse('Пользователь заблокирован или удалён', 403);
    }

    if (empty($user['email_verified_at'])) {
        errorResponse('Подтвердите email перед входом', 403, [
            'code' => 'email_not_verified',
            'email' => $user['email'],
            'can_resend' => true,
        ]);
    }

    markAppSessionAuthenticated((int) $user['id']);

    $updateLoginStmt = $pdo->prepare("
        UPDATE users
        SET last_login_at = NOW()
        WHERE id = :id
        LIMIT 1
    ");
    $updateLoginStmt->execute([
        'id' => (int) $user['id'],
    ]);

    unset($user['password_hash']);
    $user['is_email_verified'] = 1;

    successResponse([
        'message' => 'Вход выполнен успешно',
        'authenticated' => true,
        'user' => $user,
    ]);
} catch (Throwable $e) {
    error_log('[auth/login] ' . $e::class . ': ' . $e->getMessage());
    errorResponse('Не удалось выполнить вход', 500);
}
