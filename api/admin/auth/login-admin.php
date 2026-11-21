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

$email = trim($input['email'] ?? '');
$password = trim($input['password'] ?? '');

$errors = [];

if ($email === '') {
    $errors['email'] = 'Введите email';
} elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'Некорректный email';
}

if ($password === '') {
    $errors['password'] = 'Введите пароль';
}

if (!empty($errors)) {
    errorResponse('Ошибка валидации', 422, [
        'errors' => $errors,
    ]);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            u.id,
            u.role_id,
            u.email,
            u.password_hash,
            u.first_name,
            u.last_name,
            u.status,
            r.code AS role_code,
            r.title AS role_title
        FROM users u
        INNER JOIN roles r
            ON r.id = u.role_id
        WHERE u.email = :email
        LIMIT 1
    ");

    $stmt->execute([
        'email' => $email,
    ]);

    $user = $stmt->fetch();

    if (!$user) {
        errorResponse('Неверный email или пароль', 401);
    }

    if ($user['status'] !== 'active') {
        errorResponse('Пользователь заблокирован или удалён', 403);
    }

    if (!password_verify($password, $user['password_hash'])) {
        errorResponse('Неверный email или пароль', 401);
    }

    if ($user['role_code'] !== 'admin') {
        errorResponse('Недостаточно прав для входа в админку', 403);
    }

    session_regenerate_id(true);

    $_SESSION['admin_user'] = [
        'id' => (int) $user['id'],
        'email' => $user['email'],
        'name' => trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? '')),
        'role_code' => $user['role_code'],
        'role_title' => $user['role_title'],
        'access_type' => 'account',
    ];

    successResponse([
        'message' => 'Вход в админку выполнен',
        'authenticated' => true,
        'user' => $_SESSION['admin_user'],
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось выполнить вход в админку', 500, [
        'error' => $e->getMessage(),
    ]);
}
