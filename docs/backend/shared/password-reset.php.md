# api/shared/password-reset.php

## Статус

| Поле | Значение |
|---|---|
| Целевая версия backend | да |
| Полный PHP-код | да |
| Дата подготовки | 2026-08-09 |
| Путь на хосте | `/www/native-places.ru/api/shared/password-reset.php` |
| Секреты в документе | нет |

## Назначение

Общий сервис токенов и SMTP-писем восстановления пароля.

## Изменения этой версии

- Новый модуль отделяет бизнес-логику восстановления от HTTP-endpoint.

## Проверка после загрузки

1. Выполнить `php -l /www/native-places.ru/api/shared/password-reset.php` или проверить синтаксис в панели хостинга.
2. Выполнить связанный пользовательский сценарий по инструкции из архива.
3. Не добавлять реальные пароли и персональные данные в этот документ.

## PHP-код

```php
<?php

require_once __DIR__ . '/mailer.php';
require_once __DIR__ . '/../config/app.php';

class PasswordResetRateLimitException extends RuntimeException
{
    private int $retryAfterSeconds;

    public function __construct(int $retryAfterSeconds)
    {
        $this->retryAfterSeconds = $retryAfterSeconds;
        parent::__construct('Слишком частый запрос восстановления пароля');
    }

    public function getRetryAfterSeconds(): int
    {
        return $this->retryAfterSeconds;
    }
}

function assertPasswordResetRequestAllowed(PDO $pdo, int $userId): void
{
    $resetConfig = getAppConfig()['password_reset'];
    $cooldownSeconds = max(1, (int) $resetConfig['request_cooldown_seconds']);
    $dailyLimit = max(1, (int) $resetConfig['daily_limit']);

    $stmt = $pdo->prepare("
        SELECT
            TIMESTAMPDIFF(SECOND, MAX(created_at), NOW()) AS seconds_since_last,
            SUM(created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)) AS daily_count
        FROM password_resets
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
        throw new PasswordResetRateLimitException(
            max(1, $cooldownSeconds - $secondsSinceLast)
        );
    }

    if ($dailyCount >= $dailyLimit) {
        throw new PasswordResetRateLimitException(86400);
    }
}

function createPasswordResetToken(PDO $pdo, int $userId): array
{
    $ttlMinutes = max(1, (int) getAppConfig()['password_reset']['ttl_minutes']);
    $plainToken = bin2hex(random_bytes(32));
    $tokenHash = hash('sha256', $plainToken);
    $expiresAt = (new DateTimeImmutable())
        ->modify('+' . $ttlMinutes . ' minutes')
        ->format('Y-m-d H:i:s');

    $expireOldStmt = $pdo->prepare("
        UPDATE password_resets
        SET used_at = NOW()
        WHERE user_id = :user_id
        AND used_at IS NULL
    ");

    $expireOldStmt->execute([
        'user_id' => $userId,
    ]);

    $insertStmt = $pdo->prepare("
        INSERT INTO password_resets (
            user_id,
            token_hash,
            expires_at
        ) VALUES (
            :user_id,
            :token_hash,
            :expires_at
        )
    ");

    $insertStmt->execute([
        'user_id' => $userId,
        'token_hash' => $tokenHash,
        'expires_at' => $expiresAt,
    ]);

    return [
        'token' => $plainToken,
        'token_hash' => $tokenHash,
        'expires_at' => $expiresAt,
    ];
}

function buildPasswordResetFrontendUrl(string $token): string
{
    $frontendUrl = getAppConfig()['frontend_url'];

    return $frontendUrl . '/auth?reset_token=' . rawurlencode($token);
}

function sendPasswordResetEmail(
    string $email,
    string $firstName,
    string $token,
    string $expiresAt
): array {
    $resetUrl = buildPasswordResetFrontendUrl($token);
    $safeName = htmlspecialchars(
        $firstName !== '' ? $firstName : 'пользователь',
        ENT_QUOTES,
        'UTF-8'
    );
    $safeUrl = htmlspecialchars($resetUrl, ENT_QUOTES, 'UTF-8');
    $safeExpiresAt = htmlspecialchars($expiresAt, ENT_QUOTES, 'UTF-8');

    $htmlBody = '
        <h1>Восстановление пароля</h1>
        <p>Здравствуйте, ' . $safeName . '!</p>
        <p>Чтобы задать новый пароль Native Places, перейдите по ссылке:</p>
        <p><a href="' . $safeUrl . '">Задать новый пароль</a></p>
        <p>Ссылка действует до: ' . $safeExpiresAt . '.</p>
        <p>Если вы не запрашивали восстановление пароля, просто проигнорируйте это письмо.</p>
    ';

    $textBody = "Native Places\n\n"
        . 'Здравствуйте, ' . ($firstName !== '' ? $firstName : 'пользователь') . "!\n\n"
        . "Чтобы задать новый пароль, перейдите по ссылке:\n"
        . $resetUrl . "\n\n"
        . 'Ссылка действует до: ' . $expiresAt . ".\n\n"
        . 'Если вы не запрашивали восстановление пароля, просто проигнорируйте это письмо.';

    return sendPlatformEmail(
        $email,
        'Восстановление пароля Native Places',
        $htmlBody,
        $textBody,
        'notify'
    );
}

```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-08-09 | Подготовлена исправленная полная версия по результатам сверки frontend, backend и структуры БД. |
