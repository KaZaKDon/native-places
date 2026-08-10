# api/shared/mailer.php

## Статус

| Поле | Значение |
|---|---|
| Целевая версия backend | да |
| Полный PHP-код | да |
| Дата подготовки | 2026-08-09 |
| Путь на хосте | `/www/native-places.ru/api/shared/mailer.php` |
| Секреты в документе | нет |

## Назначение

Формирует multipart email и отправляет его через выбранный SMTP-профиль.

## Изменения этой версии

- Добавлена TLS-проверка сертификата и проверка адресов.
- SMTP-пароль не включается в текст исключения.
- Реализована полная запись данных в сокет и контроль таймаута.

## Проверка после загрузки

1. Выполнить `php -l /www/native-places.ru/api/shared/mailer.php` или проверить синтаксис в панели хостинга.
2. Выполнить связанный пользовательский сценарий по инструкции из архива.
3. Не добавлять реальные пароли и персональные данные в этот документ.

## PHP-код

```php
<?php

function sendPlatformEmail(
    string $to,
    string $subject,
    string $htmlBody,
    ?string $textBody = null,
    ?string $profile = null
): array {
    $configPath = __DIR__ . '/../config/mail.php';

    if (!is_file($configPath)) {
        throw new RuntimeException('Файл настроек почты не найден');
    }

    $mailConfig = require $configPath;
    $profile = $profile ?: (string) ($mailConfig['default_profile'] ?? 'notify');
    $profiles = $mailConfig['profiles'] ?? [];

    if (!isset($profiles[$profile]) || !is_array($profiles[$profile])) {
        throw new InvalidArgumentException('Почтовый профиль не найден: ' . $profile);
    }

    $settings = $profiles[$profile];

    foreach (['host', 'port', 'username', 'password', 'from_email', 'from_name'] as $key) {
        if (!isset($settings[$key]) || trim((string) $settings[$key]) === '') {
            throw new InvalidArgumentException('Не заполнена настройка почты: ' . $key);
        }
    }

    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
        throw new InvalidArgumentException('Некорректный email получателя');
    }

    if (!filter_var($settings['from_email'], FILTER_VALIDATE_EMAIL)) {
        throw new InvalidArgumentException('Некорректный email отправителя');
    }

    $textBody = $textBody ?: htmlToPlainText($htmlBody);
    $message = buildEmailMessage(
        (string) $settings['from_email'],
        (string) $settings['from_name'],
        $to,
        $subject,
        $htmlBody,
        $textBody,
        (string) ($settings['message_id_domain'] ?? 'native-places.ru')
    );

    smtpSend($settings, $to, $message);

    return [
        'sent' => true,
        'profile' => $profile,
        'to' => $to,
    ];
}

function htmlToPlainText(string $htmlBody): string
{
    $withLineBreaks = preg_replace('/<br\s*\/?>/i', "\n", $htmlBody);
    $withParagraphBreaks = preg_replace('/<\/p\s*>/i', "\n\n", (string) $withLineBreaks);

    return trim(html_entity_decode(strip_tags((string) $withParagraphBreaks), ENT_QUOTES, 'UTF-8'));
}

function sanitizeEmailHeader(string $value): string
{
    return trim((string) preg_replace('/[\r\n]+/u', ' ', $value));
}

function buildEmailMessage(
    string $fromEmail,
    string $fromName,
    string $to,
    string $subject,
    string $htmlBody,
    string $textBody,
    string $messageIdDomain
): string {
    $boundary = 'np_' . bin2hex(random_bytes(16));
    $safeSubject = sanitizeEmailHeader($subject);
    $safeFromName = sanitizeEmailHeader($fromName);
    $safeMessageIdDomain = preg_replace('/[^a-z0-9.-]/i', '', $messageIdDomain) ?: 'native-places.ru';

    $headers = [
        'From: ' . mb_encode_mimeheader($safeFromName, 'UTF-8', 'B') . ' <' . $fromEmail . '>',
        'To: <' . $to . '>',
        'Subject: ' . mb_encode_mimeheader($safeSubject, 'UTF-8', 'B'),
        'MIME-Version: 1.0',
        'Content-Type: multipart/alternative; boundary="' . $boundary . '"',
        'Date: ' . date(DATE_RFC2822),
        'Message-ID: <' . bin2hex(random_bytes(16)) . '@' . $safeMessageIdDomain . '>',
    ];

    $body = [
        '--' . $boundary,
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
        '',
        rtrim(chunk_split(base64_encode($textBody))),
        '--' . $boundary,
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
        '',
        rtrim(chunk_split(base64_encode($htmlBody))),
        '--' . $boundary . '--',
        '',
    ];

    return implode("\r\n", $headers) . "\r\n\r\n" . implode("\r\n", $body);
}

function smtpSend(array $settings, string $to, string $message): void
{
    $host = (string) $settings['host'];
    $port = (int) $settings['port'];
    $timeout = (int) ($settings['timeout'] ?? 20);
    $encryption = strtolower((string) ($settings['encryption'] ?? 'ssl'));

    if (!in_array($encryption, ['ssl', 'tls', 'none'], true)) {
        throw new InvalidArgumentException('Неподдерживаемый тип SMTP-шифрования');
    }

    $context = stream_context_create([
        'ssl' => [
            'verify_peer' => true,
            'verify_peer_name' => true,
            'allow_self_signed' => false,
            'peer_name' => $host,
        ],
    ]);

    $remote = $encryption === 'ssl' ? 'ssl://' . $host : $host;
    $socket = stream_socket_client(
        $remote . ':' . $port,
        $errno,
        $errstr,
        $timeout,
        STREAM_CLIENT_CONNECT,
        $context
    );

    if (!$socket) {
        throw new RuntimeException('Не удалось подключиться к SMTP: ' . $errstr . ' (' . $errno . ')');
    }

    stream_set_timeout($socket, $timeout);

    try {
        smtpExpect($socket, [220]);
        smtpCommand($socket, 'EHLO native-places.ru', [250]);

        if ($encryption === 'tls') {
            smtpCommand($socket, 'STARTTLS', [220]);

            if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                throw new RuntimeException('Не удалось включить TLS для SMTP');
            }

            smtpCommand($socket, 'EHLO native-places.ru', [250]);
        }

        smtpCommand($socket, 'AUTH LOGIN', [334]);
        smtpCommand($socket, base64_encode((string) $settings['username']), [334]);
        smtpCommand($socket, base64_encode((string) $settings['password']), [235]);
        smtpCommand($socket, 'MAIL FROM:<' . $settings['from_email'] . '>', [250]);
        smtpCommand($socket, 'RCPT TO:<' . $to . '>', [250, 251]);
        smtpCommand($socket, 'DATA', [354]);
        smtpWrite($socket, smtpEscapeMessage($message) . "\r\n.\r\n");
        smtpExpect($socket, [250]);
        smtpCommand($socket, 'QUIT', [221]);
    } finally {
        fclose($socket);
    }
}

function smtpCommand($socket, string $command, array $expectedCodes): string
{
    smtpWrite($socket, $command . "\r\n");

    return smtpExpect($socket, $expectedCodes);
}

function smtpWrite($socket, string $data): void
{
    $length = strlen($data);
    $written = 0;

    while ($written < $length) {
        $result = fwrite($socket, substr($data, $written));

        if ($result === false || $result === 0) {
            throw new RuntimeException('Не удалось отправить данные SMTP-серверу');
        }

        $written += $result;
    }
}

function smtpExpect($socket, array $expectedCodes): string
{
    $response = smtpReadResponse($socket);
    $code = (int) substr($response, 0, 3);

    if (!in_array($code, $expectedCodes, true)) {
        throw new RuntimeException(
            'SMTP ошибка. Ожидали: ' . implode(', ', $expectedCodes) . '. Код ответа: ' . $code
        );
    }

    return $response;
}

function smtpReadResponse($socket): string
{
    $response = '';

    while (($line = fgets($socket, 515)) !== false) {
        $response .= $line;

        if (isset($line[3]) && $line[3] === ' ') {
            break;
        }
    }

    $metadata = stream_get_meta_data($socket);

    if (!empty($metadata['timed_out'])) {
        throw new RuntimeException('Истекло время ожидания ответа SMTP-сервера');
    }

    if ($response === '') {
        throw new RuntimeException('Пустой ответ SMTP-сервера');
    }

    return trim($response);
}

function smtpEscapeMessage(string $message): string
{
    $lines = preg_split('/\r\n|\n|\r/', $message) ?: [];

    foreach ($lines as &$line) {
        if (str_starts_with($line, '.')) {
            $line = '.' . $line;
        }
    }
    unset($line);

    return implode("\r\n", $lines);
}

```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-08-09 | Подготовлена исправленная полная версия по результатам сверки frontend, backend и структуры БД. |
