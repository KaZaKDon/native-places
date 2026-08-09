# Email verification backend step

Этот документ — копия/инструкция для ручного переноса backend-файлов на хост.

Перед заменой файлов на хосте сделать резервные копии:

```txt
api/auth/register.backup-before-email-verification.php
api/auth/verify-email.backup.php — если файл уже существует
api/auth/resend-verification.backup.php — если файл уже существует
```

## Уже выполненная SQL-часть

См. `docs/sql/2026-07-08-create-email-verification-tokens.sql`.

На хосте уже добавлены:

- `users.email_verified_at`;
- таблица `email_verification_tokens`;
- старые активные пользователи помечены подтверждёнными.

## 1. `api/shared/email-verification.php`

Создать файл:

```txt
api/shared/email-verification.php
```

```php
<?php

require_once __DIR__ . '/mailer.php';

const EMAIL_VERIFICATION_TTL_HOURS = 24;
const EMAIL_VERIFICATION_FRONTEND_URL = 'https://native-places.ru/verify-email';

function createEmailVerificationToken(PDO $pdo, int $userId, string $email): array
{
    $plainToken = bin2hex(random_bytes(32));
    $tokenHash = hash('sha256', $plainToken);
    $expiresAt = (new DateTimeImmutable())
        ->modify('+' . EMAIL_VERIFICATION_TTL_HOURS . ' hours')
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


function buildEmailVerificationFrontendUrl(string $token): string
{
    $frontendUrl = getenv('EMAIL_VERIFICATION_FRONTEND_URL') ?: EMAIL_VERIFICATION_FRONTEND_URL;
    $frontendUrl = rtrim($frontendUrl, '?&');
    $separator = strpos($frontendUrl, '?') !== false ? '&' : '?';

    return $frontendUrl . $separator . 'token=' . urlencode($token);
}

function sendEmailVerificationEmail(string $email, string $firstName, string $token, string $expiresAt): array
{
    $verificationUrl = buildEmailVerificationFrontendUrl($token);
    $safeName = htmlspecialchars($firstName !== '' ? $firstName : 'пользователь', ENT_QUOTES, 'UTF-8');
    $safeUrl = htmlspecialchars($verificationUrl, ENT_QUOTES, 'UTF-8');

    $htmlBody = '
        <h1>Подтвердите email</h1>
        <p>Здравствуйте, ' . $safeName . '!</p>
        <p>Чтобы завершить регистрацию в Native Places, подтвердите email.</p>
        <p><a href="' . $safeUrl . '">Подтвердить email</a></p>
        <p>Ссылка действует 24 часа, до: ' . htmlspecialchars($expiresAt, ENT_QUOTES, 'UTF-8') . '.</p>
        <p>Если вы не регистрировались на Native Places, просто проигнорируйте это письмо.</p>
    ';

    $textBody = "Native Places\n\n"
        . "Здравствуйте, " . ($firstName !== '' ? $firstName : 'пользователь') . "!\n\n"
        . "Чтобы завершить регистрацию, подтвердите email по ссылке:\n"
        . $verificationUrl . "\n\n"
        . "Ссылка действует 24 часа, до: " . $expiresAt . ".\n\n"
        . "Если вы не регистрировались на Native Places, просто проигнорируйте это письмо.";

    return sendPlatformEmail(
        $email,
        'Подтверждение email Native Places',
        $htmlBody,
        $textBody,
        'notify'
    );
}
```

## 2. `api/auth/register.php`

Полностью заменить файл:

```txt
api/auth/register.php
```

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../shared/email-verification.php';

$input = json_decode(
    file_get_contents('php://input'),
    true
);

if (!is_array($input)) {
    errorResponse('Некорректный JSON', 400);
}

$email = trim($input['email'] ?? '');
$password = trim($input['password'] ?? '');
$firstName = trim($input['first_name'] ?? '');
$profileStatus = trim($input['profile_status'] ?? '');
$phone = trim($input['phone'] ?? '');
$telegram = trim($input['telegram'] ?? '');
$acceptedTermsRaw = $input['accepted_terms'] ?? false;
$acceptedPersonalDataRaw = $input['accepted_personal_data'] ?? false;
$acceptedMarketingRaw = $input['accepted_marketing'] ?? false;

$acceptedTerms = isTruthyConsentValue($acceptedTermsRaw);
$acceptedPersonalData = isTruthyConsentValue($acceptedPersonalDataRaw);
$acceptedMarketing = isTruthyConsentValue($acceptedMarketingRaw);

$termsDocumentVersion = '1.0';
$personalDataDocumentVersion = '1.0';
$marketingDocumentVersion = '1.0';

$errors = [];

if ($firstName === '') {
    $errors['first_name'] = 'Введите имя';
}

if ($email === '') {
    $errors['email'] = 'Введите email';
} elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'Некорректный email';
}

if ($password === '') {
    $errors['password'] = 'Введите пароль';
} elseif (mb_strlen($password) < 6) {
    $errors['password'] = 'Пароль должен содержать минимум 6 символов';
}

if (mb_strlen($profileStatus) > 255) {
    $errors['profile_status'] = 'Статус не должен быть длиннее 255 символов';
}

if (!$acceptedTerms) {
    $errors['accepted_terms'] = 'Необходимо принять правила сайта';
}

if (!$acceptedPersonalData) {
    $errors['accepted_personal_data'] = 'Необходимо дать согласие на обработку персональных данных';
}

if (!empty($errors)) {
    errorResponse('Ошибка валидации', 422, [
        'errors' => $errors,
    ]);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT id
        FROM users
        WHERE email = :email
        LIMIT 1
    ");

    $stmt->execute([
        'email' => $email,
    ]);

    $existingUser = $stmt->fetch();

    if ($existingUser) {
        errorResponse('Пользователь с таким email уже существует', 409);
    }

    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    $acceptedAt = (new DateTimeImmutable())->format('Y-m-d H:i:s');
    $ipAddress = getClientIpAddress();
    $userAgent = substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 512);

    $pdo->beginTransaction();

    $insertStmt = $pdo->prepare("
        INSERT INTO users (
            role_id,
            email,
            password_hash,
            first_name,
            profile_status,
            phone,
            telegram,
            status,
            email_verified_at
        ) VALUES (
            :role_id,
            :email,
            :password_hash,
            :first_name,
            :profile_status,
            :phone,
            :telegram,
            :status,
            NULL
        )
    ");

    $insertStmt->execute([
        'role_id' => 1,
        'email' => $email,
        'password_hash' => $passwordHash,
        'first_name' => $firstName,
        'profile_status' => $profileStatus !== '' ? $profileStatus : null,
        'phone' => $phone !== '' ? $phone : null,
        'telegram' => $telegram !== '' ? $telegram : null,
        'status' => 'active',
    ]);

    $userId = (int) $pdo->lastInsertId();

    $consentStmt = $pdo->prepare("
        INSERT INTO user_consents (
            user_id,
            consent_type,
            document_version,
            accepted_at,
            ip_address,
            user_agent,
            created_at
        ) VALUES (
            :user_id,
            :consent_type,
            :document_version,
            :accepted_at,
            :ip_address,
            :user_agent,
            NOW()
        )
    ");

    $consents = [
        [
            'type' => 'terms',
            'document_version' => $termsDocumentVersion,
        ],
        [
            'type' => 'personal_data',
            'document_version' => $personalDataDocumentVersion,
        ],
    ];

    if ($acceptedMarketing) {
        $consents[] = [
            'type' => 'marketing_emails',
            'document_version' => $marketingDocumentVersion,
        ];
    }

    foreach ($consents as $consent) {
        $consentStmt->execute([
            'user_id' => $userId,
            'consent_type' => $consent['type'],
            'document_version' => $consent['document_version'],
            'accepted_at' => $acceptedAt,
            'ip_address' => $ipAddress,
            'user_agent' => $userAgent !== '' ? $userAgent : null,
        ]);
    }

    $verificationToken = createEmailVerificationToken($pdo, $userId, $email);

    sendEmailVerificationEmail(
        $email,
        $firstName,
        $verificationToken['token'],
        $verificationToken['expires_at']
    );

    $pdo->commit();

    successResponse([
        'message' => 'Пользователь успешно зарегистрирован. Проверьте почту и подтвердите email.',
        'requires_email_verification' => true,
        'email' => $email,
        'verification_expires_at' => $verificationToken['expires_at'],
        'user' => [
            'id' => $userId,
            'role_id' => 1,
            'email' => $email,
            'first_name' => $firstName,
            'profile_status' => $profileStatus !== '' ? $profileStatus : null,
            'phone' => $phone !== '' ? $phone : null,
            'telegram' => $telegram !== '' ? $telegram : null,
            'accepted_terms' => true,
            'accepted_personal_data' => true,
            'accepted_marketing' => $acceptedMarketing,
            'terms_document_version' => $termsDocumentVersion,
            'personal_data_document_version' => $personalDataDocumentVersion,
            'marketing_document_version' => $acceptedMarketing ? $marketingDocumentVersion : null,
            'terms_accepted_at' => $acceptedAt,
            'personal_data_accepted_at' => $acceptedAt,
            'marketing_accepted_at' => $acceptedMarketing ? $acceptedAt : null,
            'email_verified_at' => null,
            'status' => 'active',
        ],
    ], 201);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось выполнить регистрацию', 500, [
        'error' => $e->getMessage(),
    ]);
}

function isTruthyConsentValue($value): bool
{
    return in_array($value, [1, '1', true, 'true', 'on', 'yes'], true);
}

function getClientIpAddress(): ?string
{
    $rawIp = $_SERVER['HTTP_CF_CONNECTING_IP']
        ?? $_SERVER['HTTP_X_FORWARDED_FOR']
        ?? $_SERVER['REMOTE_ADDR']
        ?? null;

    if (!$rawIp) {
        return null;
    }

    $ip = trim(explode(',', $rawIp)[0]);

    return $ip !== '' ? substr($ip, 0, 45) : null;
}
```

## 3. `api/auth/verify-email.php`

Создать файл:

```txt
api/auth/verify-email.php
```

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    $input = [];
}

$token = trim((string) ($_GET['token'] ?? ($input['token'] ?? '')));

if ($token === '') {
    errorResponse('Не передан токен подтверждения email', 422);
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

    $expiresAt = new DateTimeImmutable($verificationToken['expires_at']);
    $now = new DateTimeImmutable();

    if ($expiresAt < $now) {
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

    if (empty($user['email_verified_at'])) {
        $updateUserStmt = $pdo->prepare("
            UPDATE users
            SET
                email_verified_at = NOW(),
                updated_at = NOW()
            WHERE id = :id
            LIMIT 1
        ");

        $updateUserStmt->execute([
            'id' => (int) $user['id'],
        ]);
    }

    $updateTokenStmt = $pdo->prepare("
        UPDATE email_verification_tokens
        SET used_at = NOW()
        WHERE id = :id
        LIMIT 1
    ");

    $updateTokenStmt->execute([
        'id' => (int) $verificationToken['id'],
    ]);

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

    errorResponse('Не удалось подтвердить email', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## 4. `api/auth/resend-verification.php`

Создать файл:

```txt
api/auth/resend-verification.php
```

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../shared/email-verification.php';

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    errorResponse('Некорректный JSON', 400);
}

$email = trim((string) ($input['email'] ?? ''));

if ($email === '') {
    errorResponse('Введите email', 422);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    errorResponse('Некорректный email', 422);
}

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

    if (!$user) {
        successResponse([
            'message' => 'Если такой email зарегистрирован и не подтверждён, мы отправим письмо повторно.',
            'resent' => false,
        ]);
    }

    if (($user['status'] ?? '') !== 'active') {
        errorResponse('Пользователь заблокирован или удалён', 403);
    }

    if (!empty($user['email_verified_at'])) {
        successResponse([
            'message' => 'Email уже подтверждён. Можно войти в аккаунт.',
            'email_verified' => true,
            'resent' => false,
        ]);
    }

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
        'message' => 'Письмо подтверждения отправлено повторно',
        'resent' => true,
        'email' => $user['email'],
        'verification_expires_at' => $verificationToken['expires_at'],
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось отправить письмо подтверждения', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## Проверка после загрузки

### 1. Проверить синтаксис PHP

Если есть возможность в терминале на хосте:

```bash
php -l api/shared/email-verification.php
php -l api/auth/register.php
php -l api/auth/verify-email.php
php -l api/auth/resend-verification.php
```

### 2. Зарегистрировать нового пользователя

Через frontend или через API. Ожидаемый результат:

- пользователь создан;
- `email_verified_at = NULL`;
- в `email_verification_tokens` появилась запись;
- пришло письмо подтверждения.

### 3. Перейти по ссылке из письма

Ожидаемый результат:

- `users.email_verified_at` заполнен;
- `email_verification_tokens.used_at` заполнен;
- API вернул успех.

### 4. Повторная отправка

POST:

```txt
https://native-places.ru/api/auth/resend-verification.php
```

Тело:

```json
{
  "email": "user@example.com"
}
```

Ожидаемый результат:

- если email не подтверждён — новое письмо;
- если подтверждён — сообщение, что подтверждение уже есть.
