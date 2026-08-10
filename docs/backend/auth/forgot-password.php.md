# api/auth/forgot-password.php

## Статус

| Поле | Значение |
|---|---|
| Целевая версия backend | да |
| Полный PHP-код | да |
| Дата подготовки | 2026-08-09 |
| Путь на хосте | `/www/native-places.ru/api/auth/forgot-password.php` |
| Секреты в документе | нет |

## Назначение

Создаёт одноразовый токен восстановления пароля и отправляет сервисное письмо.

## Метод и URL

```http
POST /api/auth/forgot-password.php
```

## Изменения этой версии

- PHP mail() заменён общим SMTP-модулем.
- URL frontend берётся из серверной конфигурации.
- Ответ не раскрывает существование email.

## Проверка после загрузки

1. Выполнить `php -l /www/native-places.ru/api/auth/forgot-password.php` или проверить синтаксис в панели хостинга.
2. Выполнить связанный пользовательский сценарий по инструкции из архива.
3. Не добавлять реальные пароли и персональные данные в этот документ.

## PHP-код

```php
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
