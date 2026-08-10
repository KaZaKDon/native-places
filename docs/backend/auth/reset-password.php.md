# api/auth/reset-password.php

## Статус

| Поле | Значение |
|---|---|
| Целевая версия backend | да |
| Полный PHP-код | да |
| Дата подготовки | 2026-08-09 |
| Путь на хосте | `/www/native-places.ru/api/auth/reset-password.php` |
| Секреты в документе | нет |

## Назначение

Проверяет одноразовый токен, меняет пароль и инвалидирует остальные токены восстановления пользователя.

## Метод и URL

```http
POST /api/auth/reset-password.php
```

## Изменения этой версии

- Добавлена проверка HTTP-метода и безопасное журналирование ошибок.
- Истёкшая ссылка возвращает HTTP 410.

## Проверка после загрузки

1. Выполнить `php -l /www/native-places.ru/api/auth/reset-password.php` или проверить синтаксис в панели хостинга.
2. Выполнить связанный пользовательский сценарий по инструкции из архива.
3. Не добавлять реальные пароли и персональные данные в этот документ.

## PHP-код

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/request.php';
require_once __DIR__ . '/../config/database.php';

requireHttpMethod('POST');
$input = readJsonBody();
$token = trim((string) ($input['token'] ?? ''));
$password = (string) ($input['password'] ?? '');
$errors = [];

if (!preg_match('/^[a-f0-9]{64}$/i', $token)) {
    $errors['token'] = 'Некорректная или устаревшая ссылка восстановления';
}

if ($password === '') {
    $errors['password'] = 'Введите новый пароль';
} elseif (mb_strlen($password) < 6) {
    $errors['password'] = 'Пароль должен содержать минимум 6 символов';
}

if ($errors !== []) {
    errorResponse('Ошибка валидации', 422, [
        'errors' => $errors,
    ]);
}

try {
    $pdo = getDatabaseConnection();
    $tokenHash = hash('sha256', $token);
    $pdo->beginTransaction();

    $stmt = $pdo->prepare("
        SELECT
            pr.id,
            pr.user_id,
            pr.expires_at,
            pr.used_at,
            u.status
        FROM password_resets pr
        INNER JOIN users u ON u.id = pr.user_id
        WHERE pr.token_hash = :token_hash
        AND pr.used_at IS NULL
        LIMIT 1
        FOR UPDATE
    ");

    $stmt->execute([
        'token_hash' => $tokenHash,
    ]);

    $reset = $stmt->fetch();

    if (!$reset) {
        $pdo->rollBack();
        errorResponse('Ссылка восстановления недействительна', 400);
    }

    if ($reset['status'] !== 'active') {
        $pdo->rollBack();
        errorResponse('Пользователь заблокирован или удалён', 403);
    }

    if (new DateTimeImmutable($reset['expires_at']) < new DateTimeImmutable()) {
        $pdo->rollBack();
        errorResponse('Срок действия ссылки восстановления истёк', 410);
    }

    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    $userId = (int) $reset['user_id'];

    $updateUserStmt = $pdo->prepare("
        UPDATE users
        SET
            password_hash = :password_hash,
            updated_at = NOW()
        WHERE id = :user_id
        LIMIT 1
    ");

    $updateUserStmt->execute([
        'password_hash' => $passwordHash,
        'user_id' => $userId,
    ]);

    $expireTokensStmt = $pdo->prepare("
        UPDATE password_resets
        SET used_at = NOW()
        WHERE user_id = :user_id
        AND used_at IS NULL
    ");

    $expireTokensStmt->execute([
        'user_id' => $userId,
    ]);

    $pdo->commit();

    successResponse([
        'message' => 'Пароль обновлён. Теперь можно войти.',
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    error_log('[auth/reset-password] ' . $e::class . ': ' . $e->getMessage());
    errorResponse('Не удалось обновить пароль', 500);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-08-09 | Подготовлена исправленная полная версия по результатам сверки frontend, backend и структуры БД. |
