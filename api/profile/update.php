<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(
    file_get_contents('php://input'),
    true
);

$firstName = trim($input['first_name'] ?? '');
$profileStatus = trim($input['profile_status'] ?? '');
$phone = trim($input['phone'] ?? '');
$telegram = trim($input['telegram'] ?? '');

$errors = [];

if ($firstName === '') {
    $errors['first_name'] = 'Введите имя';
}

if (mb_strlen($profileStatus) > 255) {
    $errors['profile_status'] = 'Статус не должен быть длиннее 255 символов';
}

if (!empty($errors)) {
    errorResponse('Ошибка валидации', 422, [
        'errors' => $errors,
    ]);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        UPDATE users
        SET
            first_name = :first_name,
            profile_status = :profile_status,
            phone = :phone,
            telegram = :telegram,
            updated_at = NOW()
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'first_name' => $firstName,
        'profile_status' => $profileStatus !== '' ? $profileStatus : null,
        'phone' => $phone !== '' ? $phone : null,
        'telegram' => $telegram !== '' ? $telegram : null,
        'id' => $userId,
    ]);

    successResponse([
        'message' => 'Профиль успешно обновлён',
        'profile' => [
            'first_name' => $firstName,
            'profile_status' => $profileStatus !== '' ? $profileStatus : null,
            'phone' => $phone !== '' ? $phone : null,
            'telegram' => $telegram !== '' ? $telegram : null,
        ],
    ]);

} catch (Throwable $e) {
    errorResponse('Не удалось обновить профиль', 500, [
        'error' => $e->getMessage(),
    ]);
}
