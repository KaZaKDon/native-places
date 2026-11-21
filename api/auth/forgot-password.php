<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/request.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../shared/password-reset.php';

requireHttpMethod('POST');
$input = readJsonBody();
$email = mb_strtolower(trim((string) ($input['email'] ?? '')));

if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    errorResponse('Введите корректный email', 422, [
        'errors' => [
            'email' => 'Некорректный email',
        ],
    ]);
}

$publicMessage = 'Если такой email зарегистрирован, мы отправим ссылку для восстановления.';

try {
    $pdo = getDatabaseConnection();
    $stmt = $pdo->prepare("
        SELECT
            id,
            email,
            first_name,
            status
        FROM users
        WHERE email = :email
        LIMIT 1
    ");

    $stmt->execute([
        'email' => $email,
    ]);

    $user = $stmt->fetch();

    if (!$user || $user['status'] !== 'active') {
        successResponse([
            'message' => $publicMessage,
        ]);
    }

    assertPasswordResetRequestAllowed($pdo, (int) $user['id']);
    $pdo->beginTransaction();
    $resetToken = createPasswordResetToken($pdo, (int) $user['id']);

    sendPasswordResetEmail(
        $user['email'],
        $user['first_name'] ?? '',
        $resetToken['token'],
        $resetToken['expires_at']
    );

    $pdo->commit();

    successResponse([
        'message' => $publicMessage,
    ]);
} catch (PasswordResetRateLimitException $e) {
    header('Retry-After: ' . $e->getRetryAfterSeconds());
    successResponse([
        'message' => $publicMessage,
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('[auth/forgot-password] ' . $e::class . ': ' . $e->getMessage());
    errorResponse('Не удалось обработать запрос восстановления', 500);
}
