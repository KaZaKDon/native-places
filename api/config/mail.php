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
