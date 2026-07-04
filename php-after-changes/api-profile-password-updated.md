# Новый PHP endpoint для смены пароля в настройках

Ниже код для создания файла `api/profile/password.php` на хостинге. Endpoint нужен для блока «Пароль» в настройках кабинета: пользователь вводит текущий пароль, новый пароль и повтор нового пароля на фронте, а сервер проверяет текущий пароль и сохраняет новый `password_hash`.

## `api/profile/password.php`

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    errorResponse('Некорректный JSON', 400);
}

$currentPassword = trim($input['current_password'] ?? '');
$newPassword = trim($input['new_password'] ?? '');

$errors = [];

if ($currentPassword === '') {
    $errors['current_password'] = 'Введите текущий пароль';
}

if ($newPassword === '') {
    $errors['new_password'] = 'Введите новый пароль';
} elseif (mb_strlen($newPassword) < 6) {
    $errors['new_password'] = 'Новый пароль должен содержать минимум 6 символов';
}

if (!empty($errors)) {
    errorResponse('Проверьте поля формы', 422, [
        'errors' => $errors,
    ]);
}

try {
    $pdo = getDatabaseConnection();

    $userStmt = $pdo->prepare("
        SELECT id, password_hash
        FROM users
        WHERE id = :user_id
        LIMIT 1
    ");

    $userStmt->execute([
        'user_id' => $userId,
    ]);

    $user = $userStmt->fetch();

    if (!$user) {
        errorResponse('Пользователь не найден', 404);
    }

    if (!password_verify($currentPassword, $user['password_hash'])) {
        errorResponse('Текущий пароль указан неверно', 422, [
            'errors' => [
                'current_password' => 'Текущий пароль указан неверно',
            ],
        ]);
    }

    $passwordHash = password_hash($newPassword, PASSWORD_DEFAULT);

    $updateStmt = $pdo->prepare("
        UPDATE users
        SET
            password_hash = :password_hash,
            updated_at = NOW()
        WHERE id = :user_id
        LIMIT 1
    ");

    $updateStmt->execute([
        'password_hash' => $passwordHash,
        'user_id' => $userId,
    ]);

    successResponse([
        'message' => 'Пароль обновлён',
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось обновить пароль', 500, [
        'error' => $e->getMessage(),
    ]);
}
```
