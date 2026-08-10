# api/config/app.php

## Статус

| Поле | Значение |
|---|---|
| Целевая версия backend | да |
| Полный PHP-код | да |
| Дата подготовки | 2026-08-09 |
| Путь на хосте | `/www/native-places.ru/api/config/app.php` |
| Секреты в документе | нет |

## Назначение

Хранит серверные URL, параметры сессии и сроки действия auth-токенов.

## Изменения этой версии

- Новый единый источник runtime-настроек сайта и будущего API.

## Проверка после загрузки

1. Выполнить `php -l /www/native-places.ru/api/config/app.php` или проверить синтаксис в панели хостинга.
2. Выполнить связанный пользовательский сценарий по инструкции из архива.
3. Не добавлять реальные пароли и персональные данные в этот документ.

## PHP-код

```php
<?php

require_once __DIR__ . '/env.php';

function getAppConfig(): array
{
    static $config = null;

    if ($config !== null) {
        return $config;
    }

    $config = [
        'frontend_url' => rtrim(
            envString('APP_FRONTEND_URL', 'https://native-places.ru'),
            '/'
        ),
        'session' => [
            'name' => envString('SESSION_NAME', 'NATIVE_PLACES_SESSION'),
            'secure' => envBool('SESSION_COOKIE_SECURE', true),
            'idle_ttl_seconds' => envInt('SESSION_IDLE_TTL_SECONDS', 7200),
            'absolute_ttl_seconds' => envInt('SESSION_ABSOLUTE_TTL_SECONDS', 2592000),
        ],
        'email_verification' => [
            'ttl_hours' => envInt('EMAIL_VERIFICATION_TTL_HOURS', 24),
            'resend_cooldown_seconds' => envInt('EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS', 60),
            'daily_limit' => envInt('EMAIL_VERIFICATION_DAILY_LIMIT', 10),
        ],
        'password_reset' => [
            'ttl_minutes' => envInt('PASSWORD_RESET_TTL_MINUTES', 60),
            'request_cooldown_seconds' => envInt('PASSWORD_RESET_COOLDOWN_SECONDS', 60),
            'daily_limit' => envInt('PASSWORD_RESET_DAILY_LIMIT', 5),
        ],
    ];

    return $config;
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-08-09 | Подготовлена исправленная полная версия по результатам сверки frontend, backend и структуры БД. |
