# api/auth/resend-verification.php

## Статус

| Поле | Значение |
|---|---|
| Целевая версия backend | да |
| Полный PHP-код | да |
| Дата подготовки | 2026-08-09 |
| Путь на хосте | `/www/native-places.ru/api/auth/resend-verification.php` |
| Секреты в документе | нет |

## Назначение

Повторно создаёт и отправляет письмо подтверждения для активного неподтверждённого пользователя.

## Метод и URL

```http
POST /api/auth/resend-verification.php
```

## Изменения этой версии

- Использует нейтральный публичный ответ.
- Добавлены cooldown и суточный лимит.

## Проверка после загрузки

1. Выполнить `php -l /www/native-places.ru/api/auth/resend-verification.php` или проверить синтаксис в панели хостинга.
2. Выполнить связанный пользовательский сценарий по инструкции из архива.
3. Не добавлять реальные пароли и персональные данные в этот документ.

## PHP-код

```php
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
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-08-10 | Успешный ответ теперь сообщает frontend точное время cooldown. |
| 2026-08-09 | Подготовлена исправленная полная версия по результатам сверки frontend, backend и структуры БД. |
