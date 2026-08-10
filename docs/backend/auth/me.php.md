# api/auth/me.php

## Статус

| Поле | Значение |
|---|---|
| Целевая версия backend | да |
| Полный PHP-код | да |
| Дата подготовки | 2026-08-09 |
| Путь на хосте | `/www/native-places.ru/api/auth/me.php` |
| Секреты в документе | нет |

## Назначение

Возвращает текущего пользователя для восстановления авторизации после перезагрузки страницы.

## Метод и URL

```http
GET /api/auth/me.php
```

## Изменения этой версии

- Возвращает email_verified_at, который требуется AuthProvider на frontend.
- Удаляет сессию неактивного или неподтверждённого пользователя.

## Проверка после загрузки

1. Выполнить `php -l /www/native-places.ru/api/auth/me.php` или проверить синтаксис в панели хостинга.
2. Выполнить связанный пользовательский сценарий по инструкции из архива.
3. Не добавлять реальные пароли и персональные данные в этот документ.

## PHP-код

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/request.php';
require_once __DIR__ . '/../shared/session.php';
require_once __DIR__ . '/../config/database.php';

try {
    requireHttpMethod('GET');
    startAppSession();

    $userId = $_SESSION['user_id'] ?? null;

    if (!$userId) {
        successResponse([
            'authenticated' => false,
            'user' => null,
        ]);
    }

    $pdo = getDatabaseConnection();
    $stmt = $pdo->prepare("
        SELECT
            u.id,
            u.role_id,
            u.email,
            u.first_name,
            u.profile_status,
            u.last_name,
            u.phone,
            u.telegram,
            u.avatar,
            u.status,
            u.is_email_verified,
            u.email_verified_at,
            u.last_login_at,
            r.code AS role_code,
            r.title AS role_title
        FROM users u
        INNER JOIN roles r ON r.id = u.role_id
        WHERE u.id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => (int) $userId,
    ]);

    $user = $stmt->fetch();

    if (!$user || $user['status'] !== 'active' || empty($user['email_verified_at'])) {
        destroyAppSession();

        successResponse([
            'authenticated' => false,
            'user' => null,
        ]);
    }

    $user['is_email_verified'] = 1;

    successResponse([
        'authenticated' => true,
        'user' => $user,
    ]);
} catch (Throwable $e) {
    error_log('[auth/me] ' . $e::class . ': ' . $e->getMessage());
    errorResponse('Не удалось получить текущего пользователя', 500);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-08-09 | Подготовлена исправленная полная версия по результатам сверки frontend, backend и структуры БД. |
