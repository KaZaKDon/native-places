# api/auth/register.php

## Статус

| Поле | Значение |
|---|---|
| Целевая версия backend | да |
| Полный PHP-код | да |
| Дата подготовки | 2026-08-09 |
| Путь на хосте | `/www/native-places.ru/api/auth/register.php` |
| Секреты в документе | нет |

## Назначение

Регистрирует пользователя, фиксирует версии обязательных и необязательного согласий, создаёт токен и отправляет письмо подтверждения email.

## Метод и URL

```http
POST /api/auth/register.php
```

## Изменения этой версии

- Email нормализуется в нижний регистр, пароль не обрезается через trim().
- Версии юридических документов берутся из config/legal.php.
- Правила платформы и пользовательское соглашение фиксируются отдельными событиями.
- В публичный ответ больше не попадает текст внутреннего исключения.

## Проверка после загрузки

1. Выполнить `php -l /www/native-places.ru/api/auth/register.php` или проверить синтаксис в панели хостинга.
2. Выполнить связанный пользовательский сценарий по инструкции из архива.
3. Не добавлять реальные пароли и персональные данные в этот документ.

## PHP-код

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/request.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/legal.php';
require_once __DIR__ . '/../shared/email-verification.php';

requireHttpMethod('POST');
$input = readJsonBody();

$email = mb_strtolower(trim((string) ($input['email'] ?? '')));
$password = (string) ($input['password'] ?? '');
$firstName = trim((string) ($input['first_name'] ?? ''));
$profileStatus = trim((string) ($input['profile_status'] ?? ''));
$phone = trim((string) ($input['phone'] ?? ''));
$telegram = trim((string) ($input['telegram'] ?? ''));
$acceptedTerms = isTruthyConsentValue($input['accepted_terms'] ?? false);
$acceptedPersonalData = isTruthyConsentValue($input['accepted_personal_data'] ?? false);
$acceptedMarketing = isTruthyConsentValue($input['accepted_marketing'] ?? false);
$documentVersions = getLegalDocumentVersions();
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
    $errors['accepted_terms'] = 'Необходимо принять правила сайта и пользовательское соглашение';
}

if (!$acceptedPersonalData) {
    $errors['accepted_personal_data'] = 'Необходимо дать согласие на обработку персональных данных';
}

if ($errors !== []) {
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

    if ($stmt->fetch()) {
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
            is_email_verified,
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
            0,
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
        ['type' => 'user_agreement', 'version' => $documentVersions['user_agreement']],
        ['type' => 'platform_rules', 'version' => $documentVersions['platform_rules']],
        ['type' => 'personal_data', 'version' => $documentVersions['personal_data']],
    ];

    if ($acceptedMarketing) {
        $consents[] = [
            'type' => 'marketing_emails',
            'version' => $documentVersions['marketing_emails'],
        ];
    }

    foreach ($consents as $consent) {
        $consentStmt->execute([
            'user_id' => $userId,
            'consent_type' => $consent['type'],
            'document_version' => $consent['version'],
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
        'resend_available_in_seconds' => getEmailVerificationResendCooldownSeconds(),
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
            'document_versions' => [
                'user_agreement' => $documentVersions['user_agreement'],
                'platform_rules' => $documentVersions['platform_rules'],
                'personal_data' => $documentVersions['personal_data'],
                'marketing_emails' => $acceptedMarketing
                    ? $documentVersions['marketing_emails']
                    : null,
            ],
            'email_verified_at' => null,
            'status' => 'active',
        ],
    ], 201);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('[auth/register] ' . $e::class . ': ' . $e->getMessage());
    errorResponse('Не удалось выполнить регистрацию', 500);
}

function isTruthyConsentValue($value): bool
{
    return in_array($value, [1, '1', true, 'true', 'on', 'yes'], true);
}

function getClientIpAddress(): ?string
{
    $rawIp = $_SERVER['REMOTE_ADDR'] ?? null;

    if (!$rawIp) {
        return null;
    }

    $ip = trim((string) $rawIp);

    return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : null;
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-08-10 | В ответ добавлено серверное время ожидания до повторной отправки письма. |
| 2026-08-09 | Подготовлена исправленная полная версия по результатам сверки frontend, backend и структуры БД. |
