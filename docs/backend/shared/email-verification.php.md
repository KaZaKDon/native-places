# api/shared/email-verification.php

## Статус

| Поле | Значение |
|---|---|
| Целевая версия backend | да |
| Полный PHP-код | да |
| Дата подготовки | 2026-08-09 |
| Путь на хосте | `/www/native-places.ru/api/shared/email-verification.php` |
| Секреты в документе | нет |

## Назначение

Общий сервис токенов и писем подтверждения email.

## Изменения этой версии

- Production URL берётся из config/app.php.
- Добавлены настройки TTL, cooldown и суточного лимита.

## Проверка после загрузки

1. Выполнить `php -l /www/native-places.ru/api/shared/email-verification.php` или проверить синтаксис в панели хостинга.
2. Выполнить связанный пользовательский сценарий по инструкции из архива.
3. Не добавлять реальные пароли и персональные данные в этот документ.

## PHP-код

```php
<?php

require_once __DIR__ . '/mailer.php';
require_once __DIR__ . '/../config/app.php';

class EmailVerificationRateLimitException extends RuntimeException
{
    private int $retryAfterSeconds;

    public function __construct(int $retryAfterSeconds)
    {
        $this->retryAfterSeconds = $retryAfterSeconds;
        parent::__construct('Слишком частая повторная отправка письма');
    }

    public function getRetryAfterSeconds(): int
    {
        return $this->retryAfterSeconds;
    }
}

function createEmailVerificationToken(PDO $pdo, int $userId, string $email): array
{
    $appConfig = getAppConfig();
    $ttlHours = max(1, (int) $appConfig['email_verification']['ttl_hours']);
    $plainToken = bin2hex(random_bytes(32));
    $tokenHash = hash('sha256', $plainToken);
    $expiresAt = (new DateTimeImmutable())
        ->modify('+' . $ttlHours . ' hours')
        ->format('Y-m-d H:i:s');

    $stmt = $pdo->prepare("
        INSERT INTO email_verification_tokens (
            user_id,
            email,
            token_hash,
            expires_at,
            used_at,
            created_at
        ) VALUES (
            :user_id,
            :email,
            :token_hash,
            :expires_at,
            NULL,
            NOW()
        )
    ");

    $stmt->execute([
        'user_id' => $userId,
        'email' => $email,
        'token_hash' => $tokenHash,
        'expires_at' => $expiresAt,
    ]);

    return [
        'token' => $plainToken,
        'token_hash' => $tokenHash,
        'expires_at' => $expiresAt,
    ];
}

function invalidatePendingEmailVerificationTokens(PDO $pdo, int $userId, string $email): void
{
    $stmt = $pdo->prepare("
        UPDATE email_verification_tokens
        SET used_at = NOW()
        WHERE user_id = :user_id
        AND email = :email
        AND used_at IS NULL
    ");

    $stmt->execute([
        'user_id' => $userId,
        'email' => $email,
    ]);
}

function getEmailVerificationResendCooldownSeconds(): int
{
    return max(
        1,
        (int) getAppConfig()['email_verification']['resend_cooldown_seconds']
    );
}

function assertEmailVerificationResendAllowed(PDO $pdo, int $userId): void
{
    $verificationConfig = getAppConfig()['email_verification'];
    $cooldownSeconds = getEmailVerificationResendCooldownSeconds();
    $dailyLimit = max(1, (int) $verificationConfig['daily_limit']);

    $stmt = $pdo->prepare("
        SELECT
            TIMESTAMPDIFF(SECOND, MAX(created_at), NOW()) AS seconds_since_last,
            SUM(created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)) AS daily_count
        FROM email_verification_tokens
        WHERE user_id = :user_id
    ");

    $stmt->execute([
        'user_id' => $userId,
    ]);

    $limits = $stmt->fetch() ?: [];
    $secondsSinceLast = isset($limits['seconds_since_last'])
        ? (int) $limits['seconds_since_last']
        : null;
    $dailyCount = (int) ($limits['daily_count'] ?? 0);

    if ($secondsSinceLast !== null && $secondsSinceLast < $cooldownSeconds) {
        throw new EmailVerificationRateLimitException(
            max(1, $cooldownSeconds - $secondsSinceLast)
        );
    }

    if ($dailyCount >= $dailyLimit) {
        throw new EmailVerificationRateLimitException(86400);
    }
}

function buildEmailVerificationFrontendUrl(string $token): string
{
    $frontendUrl = getAppConfig()['frontend_url'];

    return $frontendUrl . '/verify-email?token=' . rawurlencode($token);
}

function sendEmailVerificationEmail(
    string $email,
    string $firstName,
    string $token,
    string $expiresAt
): array {
    $verificationUrl = buildEmailVerificationFrontendUrl($token);
    $safeName = htmlspecialchars(
        $firstName !== '' ? $firstName : 'пользователь',
        ENT_QUOTES,
        'UTF-8'
    );
    $safeUrl = htmlspecialchars($verificationUrl, ENT_QUOTES, 'UTF-8');
    $safeExpiresAt = htmlspecialchars($expiresAt, ENT_QUOTES, 'UTF-8');

    $htmlBody = '
        <h1>Подтвердите email</h1>
        <p>Здравствуйте, ' . $safeName . '!</p>
        <p>Чтобы завершить регистрацию в Native Places, подтвердите email.</p>
        <p><a href="' . $safeUrl . '">Подтвердить email</a></p>
        <p>Ссылка действует до: ' . $safeExpiresAt . '.</p>
        <p>Если вы не регистрировались на Native Places, просто проигнорируйте это письмо.</p>
    ';

    $textBody = "Native Places\n\n"
        . 'Здравствуйте, ' . ($firstName !== '' ? $firstName : 'пользователь') . "!\n\n"
        . "Чтобы завершить регистрацию, подтвердите email по ссылке:\n"
        . $verificationUrl . "\n\n"
        . 'Ссылка действует до: ' . $expiresAt . ".\n\n"
        . 'Если вы не регистрировались на Native Places, просто проигнорируйте это письмо.';

    return sendPlatformEmail(
        $email,
        'Подтверждение email Native Places',
        $htmlBody,
        $textBody,
        'notify'
    );
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-08-10 | Добавлен единый getter cooldown для согласованной работы backend и таймера frontend. |
| 2026-08-09 | Подготовлена исправленная полная версия по результатам сверки frontend, backend и структуры БД. |
