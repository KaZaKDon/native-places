<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/request.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../shared/email-verification.php';

requireHttpMethod('POST');
$input = readJsonBody();
$email = mb_strtolower(trim((string) ($input['email'] ?? '')));

if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    errorResponse('Введите корректный email', 422);
}

$publicMessage = 'Если такой email зарегистрирован и ещё не подтверждён, мы отправим письмо повторно.';

try {
    $pdo = getDatabaseConnection();
    $userStmt = $pdo->prepare("
        SELECT
            id,
            email,
            first_name,
            status,
            email_verified_at
        FROM users
        WHERE email = :email
        LIMIT 1
    ");

    $userStmt->execute([
        'email' => $email,
    ]);

    $user = $userStmt->fetch();

    if (!$user || ($user['status'] ?? '') !== 'active' || !empty($user['email_verified_at'])) {
        successResponse([
            'message' => $publicMessage,
            'resent' => false,
        ]);
    }

    assertEmailVerificationResendAllowed($pdo, (int) $user['id']);
    $pdo->beginTransaction();

    invalidatePendingEmailVerificationTokens(
        $pdo,
        (int) $user['id'],
        $user['email']
    );

    $verificationToken = createEmailVerificationToken(
        $pdo,
        (int) $user['id'],
        $user['email']
    );

    sendEmailVerificationEmail(
        $user['email'],
        $user['first_name'] ?? '',
        $verificationToken['token'],
        $verificationToken['expires_at']
    );

    $pdo->commit();

    successResponse([
        'message' => $publicMessage,
        'resent' => true,
        'email' => $user['email'],
        'verification_expires_at' => $verificationToken['expires_at'],
        'resend_available_in_seconds' => getEmailVerificationResendCooldownSeconds(),
    ]);
} catch (EmailVerificationRateLimitException $e) {
    $retryAfterSeconds = $e->getRetryAfterSeconds();
    header('Retry-After: ' . $retryAfterSeconds);
    errorResponse('Письмо уже отправлялось недавно. Попробуйте позже.', 429, [
        'retry_after_seconds' => $retryAfterSeconds,
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('[auth/resend-verification] ' . $e::class . ': ' . $e->getMessage());
    errorResponse('Не удалось обработать повторную отправку письма', 500);
}
