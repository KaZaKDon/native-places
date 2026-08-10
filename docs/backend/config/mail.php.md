# api/config/mail.php

## Статус

| Поле | Значение |
|---|---|
| Целевая версия backend | да |
| Полный PHP-код | да |
| Дата подготовки | 2026-08-09 |
| Путь на хосте | `/www/native-places.ru/api/config/mail.php` |
| Секреты в документе | нет |

## Назначение

Собирает SMTP-профили notify и newsletter из закрытых переменных окружения.

## Изменения этой версии

- Документ и PHP-файл не содержат настоящих паролей.

## Проверка после загрузки

1. Выполнить `php -l /www/native-places.ru/api/config/mail.php` или проверить синтаксис в панели хостинга.
2. Выполнить связанный пользовательский сценарий по инструкции из архива.
3. Не добавлять реальные пароли и персональные данные в этот документ.

## PHP-код

```php
<?php

require_once __DIR__ . '/env.php';

return [
    'default_profile' => 'notify',

    'profiles' => [
        'notify' => [
            'host' => envString('MAIL_NOTIFY_HOST', 'mail.native-places.ru'),
            'port' => envInt('MAIL_NOTIFY_PORT', 465),
            'encryption' => envString('MAIL_NOTIFY_ENCRYPTION', 'ssl'),
            'username' => envRequired('MAIL_NOTIFY_USERNAME'),
            'password' => envRequired('MAIL_NOTIFY_PASSWORD'),
            'from_email' => envString('MAIL_NOTIFY_FROM_EMAIL', envRequired('MAIL_NOTIFY_USERNAME')),
            'from_name' => envString('MAIL_NOTIFY_FROM_NAME', 'Native Places'),
            'timeout' => envInt('MAIL_NOTIFY_TIMEOUT', 20),
            'message_id_domain' => envString('MAIL_MESSAGE_ID_DOMAIN', 'native-places.ru'),
        ],

        'newsletter' => [
            'host' => envString('MAIL_NEWSLETTER_HOST', 'mail.native-places.ru'),
            'port' => envInt('MAIL_NEWSLETTER_PORT', 465),
            'encryption' => envString('MAIL_NEWSLETTER_ENCRYPTION', 'ssl'),
            'username' => envRequired('MAIL_NEWSLETTER_USERNAME'),
            'password' => envRequired('MAIL_NEWSLETTER_PASSWORD'),
            'from_email' => envString('MAIL_NEWSLETTER_FROM_EMAIL', envRequired('MAIL_NEWSLETTER_USERNAME')),
            'from_name' => envString('MAIL_NEWSLETTER_FROM_NAME', 'Native Places'),
            'timeout' => envInt('MAIL_NEWSLETTER_TIMEOUT', 20),
            'message_id_domain' => envString('MAIL_MESSAGE_ID_DOMAIN', 'native-places.ru'),
        ],
    ],

    'test_recipient' => envString('MAIL_TEST_RECIPIENT'),
];

```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-08-09 | Подготовлена исправленная полная версия по результатам сверки frontend, backend и структуры БД. |
