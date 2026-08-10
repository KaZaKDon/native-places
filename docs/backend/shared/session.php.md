# api/shared/session.php

## Статус

| Поле | Значение |
|---|---|
| Целевая версия backend | да |
| Полный PHP-код | да |
| Дата подготовки | 2026-08-09 |
| Путь на хосте | `/www/native-places.ru/api/shared/session.php` |
| Секреты в документе | нет |

## Назначение

Задаёт единые параметры пользовательской PHP-сессии, ограничивает время жизни, обновляет ID после входа и корректно уничтожает cookie.

## Изменения этой версии

- Собственное имя NATIVE_PLACES_SESSION исключает конфликт сессий.
- Включены strict mode, HttpOnly, Secure и SameSite=Lax.

## Проверка после загрузки

1. Выполнить `php -l /www/native-places.ru/api/shared/session.php` или проверить синтаксис в панели хостинга.
2. Выполнить связанный пользовательский сценарий по инструкции из архива.
3. Не добавлять реальные пароли и персональные данные в этот документ.

## PHP-код

```php
<?php

require_once __DIR__ . '/../config/app.php';

function startAppSession(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        enforceAppSessionLifetime();
        return;
    }

    $sessionConfig = getAppConfig()['session'];

    ini_set('session.use_only_cookies', '1');
    ini_set('session.use_strict_mode', '1');
    ini_set('session.cookie_httponly', '1');
    ini_set('session.cookie_samesite', 'Lax');

    session_name((string) $sessionConfig['name']);

    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'domain' => '',
        'secure' => (bool) $sessionConfig['secure'],
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    if (!session_start()) {
        throw new RuntimeException('Не удалось запустить пользовательскую сессию');
    }

    enforceAppSessionLifetime();
}

function enforceAppSessionLifetime(): void
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        return;
    }

    $now = time();
    $sessionConfig = getAppConfig()['session'];
    $createdAt = (int) ($_SESSION['_created_at'] ?? $now);
    $lastActivityAt = (int) ($_SESSION['_last_activity_at'] ?? $now);

    $isIdleExpired = $now - $lastActivityAt > (int) $sessionConfig['idle_ttl_seconds'];
    $isAbsoluteExpired = $now - $createdAt > (int) $sessionConfig['absolute_ttl_seconds'];

    if ($isIdleExpired || $isAbsoluteExpired) {
        destroyAppSession();

        if (!session_start()) {
            throw new RuntimeException('Не удалось перезапустить пользовательскую сессию');
        }

        $createdAt = $now;
    }

    $_SESSION['_created_at'] = $createdAt;
    $_SESSION['_last_activity_at'] = $now;
}

function markAppSessionAuthenticated(int $userId): void
{
    startAppSession();

    if (!session_regenerate_id(true)) {
        throw new RuntimeException('Не удалось обновить идентификатор сессии');
    }

    $now = time();

    $_SESSION = [
        'user_id' => $userId,
        '_created_at' => $now,
        '_last_activity_at' => $now,
    ];
}

function destroyAppSession(): void
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        return;
    }

    $_SESSION = [];

    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();

        setcookie(session_name(), '', [
            'expires' => time() - 42000,
            'path' => $params['path'] ?: '/',
            'domain' => $params['domain'] ?? '',
            'secure' => (bool) ($params['secure'] ?? false),
            'httponly' => (bool) ($params['httponly'] ?? true),
            'samesite' => $params['samesite'] ?? 'Lax',
        ]);
    }

    session_destroy();
}

```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-08-09 | Подготовлена исправленная полная версия по результатам сверки frontend, backend и структуры БД. |
