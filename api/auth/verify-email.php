<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/request.php';
require_once __DIR__ . '/../config/database.php';

requireHttpMethod('POST');
$input = readJsonBody();
$token = trim((string) ($input['token'] ?? ''));

if (!preg_match('/^[a-f0-9]{64}$/i', $token)) {
    errorResponse('Ссылка подтверждения email недействительна', 422);
}

try {
    $pdo = getDatabaseConnection();
    $tokenHash = hash('sha256', $token);
    $pdo->beginTransaction();

    $tokenStmt = $pdo->prepare("
        SELECT
            id,
            user_id,
            email,
            expires_at,
            used_at
        FROM email_verification_tokens
        WHERE token_hash = :token_hash
        LIMIT 1
        FOR UPDATE
    ");

    $tokenStmt->execute([
        'token_hash' => $tokenHash,
    ]);

    $verificationToken = $tokenStmt->fetch();

    if (!$verificationToken) {
        $pdo->rollBack();
        errorResponse('Ссылка подтверждения email недействительна', 404);
    }

    if (!empty($verificationToken['used_at'])) {
        $pdo->rollBack();
        errorResponse('Ссылка подтверждения email уже использована', 422);
    }

    if (new DateTimeImmutable($verificationToken['expires_at']) < new DateTimeImmutable()) {
        $pdo->rollBack();
        errorResponse('Срок действия ссылки подтверждения email истёк', 410, [
            'code' => 'email_verification_expired',
            'email' => $verificationToken['email'],
        ]);
    }

    $userStmt = $pdo->prepare("
        SELECT
            id,
            email,
            email_verified_at,
            status
        FROM users
        WHERE id = :id
        LIMIT 1
        FOR UPDATE
    ");

    $userStmt->execute([
        'id' => (int) $verificationToken['user_id'],
    ]);

    $user = $userStmt->fetch();

    if (!$user) {
        $pdo->rollBack();
        errorResponse('Пользователь для подтверждения email не найден', 404);
    }

    if (($user['status'] ?? '') !== 'active') {
        $pdo->rollBack();
        errorResponse('Нельзя подтвердить email заблокированного или удалённого пользователя', 403);
    }

    if (strcasecmp($user['email'], $verificationToken['email']) !== 0) {
        $pdo->rollBack();
        errorResponse('Email пользователя изменился. Запросите новое письмо подтверждения', 409);
    }

    $updateUserStmt = $pdo->prepare("
        UPDATE users
        SET
            is_email_verified = 1,
            email_verified_at = COALESCE(email_verified_at, NOW()),
            updated_at = NOW()
        WHERE id = :id
        LIMIT 1
    ");

    $updateUserStmt->execute([
        'id' => (int) $user['id'],
    ]);

    $updateTokenStmt = $pdo->prepare("
        UPDATE email_verification_tokens
        SET used_at = NOW()
        WHERE id = :id
        AND used_at IS NULL
        LIMIT 1
    ");

    $updateTokenStmt->execute([
        'id' => (int) $verificationToken['id'],
    ]);

    if ($updateTokenStmt->rowCount() === 0) {
        $pdo->rollBack();
        errorResponse('Ссылка подтверждения email уже использована', 422);
    }

    $pdo->commit();

    successResponse([
        'message' => 'Email успешно подтверждён. Теперь можно войти в аккаунт.',
        'email_verified' => true,
        'email' => $verificationToken['email'],
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('[auth/verify-email] ' . $e::class . ': ' . $e->getMessage());
    errorResponse('Не удалось подтвердить email', 500);
}
