# api/admin/mailings/process.php

## Назначение

Отправляет одну пачку писем по рассылке со статусом `sending`.

Endpoint специально обрабатывает ограниченное количество получателей за запрос (`limit`, по умолчанию 25), чтобы рассылка не падала из-за timeout. Админка может нажимать «Отправить пачку» повторно, пока статус не станет `sent` или `failed`.

## Метод и URL

```http
POST /api/admin/mailings/process.php
```

## Авторизация

Требуется admin session:

```php
requireAdmin();
```

## Request

```json
{
  "mailing_id": 1,
  "limit": 25
}
```

## Success response

```json
{
  "success": true,
  "data": {
    "message": "Пачка рассылки обработана",
    "mailing_id": 1,
    "status": "sending",
    "processed": 25,
    "sent_count": 25,
    "failed_count": 0,
    "pending_count": 75
  }
}
```

Если получателей больше нет, `status` станет `sent` или `failed`.

## PHP-код

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../../shared/mailer.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdmin();

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    $input = [];
}

$mailingId = (int) ($input['mailing_id'] ?? 0);
$limit = (int) ($input['limit'] ?? 25);

if ($mailingId <= 0) {
    errorResponse('Не передан ID рассылки', 400);
}

if ($limit <= 0 || $limit > 100) {
    $limit = 25;
}

function buildMailingHtmlBody(string $body): string
{
    return nl2br(htmlspecialchars($body, ENT_QUOTES, 'UTF-8'));
}

function markRecipient(PDO $pdo, int $recipientId, string $status, ?string $errorMessage = null): void
{
    $stmt = $pdo->prepare("
        UPDATE mailing_recipients
        SET
            status = :status,
            error_message = :error_message,
            sent_at = CASE WHEN :status_sent = 'sent' THEN NOW() ELSE sent_at END
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'status' => $status,
        'status_sent' => $status,
        'error_message' => $errorMessage,
        'id' => $recipientId,
    ]);
}

function refreshMailingCounters(PDO $pdo, int $mailingId): array
{
    $statsStmt = $pdo->prepare("
        SELECT
            SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) AS sent_count,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_count,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
            COUNT(*) AS total_count
        FROM mailing_recipients
        WHERE mailing_id = :mailing_id
    ");

    $statsStmt->execute([
        'mailing_id' => $mailingId,
    ]);

    $stats = $statsStmt->fetch() ?: [];

    $sentCount = (int) ($stats['sent_count'] ?? 0);
    $failedCount = (int) ($stats['failed_count'] ?? 0);
    $pendingCount = (int) ($stats['pending_count'] ?? 0);
    $totalCount = (int) ($stats['total_count'] ?? 0);

    $status = 'sending';
    $sentAtSql = 'sent_at';
    $errorMessage = null;

    if ($pendingCount === 0) {
        $status = $sentCount > 0 ? 'sent' : 'failed';
        $sentAtSql = 'NOW()';

        if ($sentCount === 0 && $failedCount > 0) {
            $errorMessage = 'Не удалось отправить письма получателям';
        }
    }

    $updateStmt = $pdo->prepare("
        UPDATE mailings
        SET
            status = :status,
            sent_count = :sent_count,
            failed_count = :failed_count,
            error_message = :error_message,
            sent_at = {$sentAtSql}
        WHERE id = :id
        LIMIT 1
    ");

    $updateStmt->execute([
        'status' => $status,
        'sent_count' => $sentCount,
        'failed_count' => $failedCount,
        'error_message' => $errorMessage,
        'id' => $mailingId,
    ]);

    return [
        'status' => $status,
        'sent_count' => $sentCount,
        'failed_count' => $failedCount,
        'pending_count' => $pendingCount,
        'total_count' => $totalCount,
    ];
}

try {
    $pdo = getDatabaseConnection();

    $mailingStmt = $pdo->prepare("
        SELECT
            id,
            subject,
            body,
            status
        FROM mailings
        WHERE id = :id
        LIMIT 1
    ");

    $mailingStmt->execute([
        'id' => $mailingId,
    ]);

    $mailing = $mailingStmt->fetch();

    if (!$mailing) {
        errorResponse('Рассылка не найдена', 404);
    }

    if ($mailing['status'] !== 'sending') {
        errorResponse('Отправлять можно только рассылку в статусе sending', 422);
    }

    $recipientsStmt = $pdo->prepare("
        SELECT
            id,
            email
        FROM mailing_recipients
        WHERE mailing_id = :mailing_id
        AND status = 'pending'
        ORDER BY id ASC
        LIMIT {$limit}
    ");

    $recipientsStmt->execute([
        'mailing_id' => $mailingId,
    ]);

    $recipients = $recipientsStmt->fetchAll();
    $processed = 0;

    foreach ($recipients as $recipient) {
        $processed++;

        try {
            $result = sendPlatformEmail(
                $recipient['email'],
                $mailing['subject'],
                buildMailingHtmlBody($mailing['body']),
                $mailing['body'],
                'notify'
            );

            if (is_array($result) && array_key_exists('success', $result) && !$result['success']) {
                markRecipient(
                    $pdo,
                    (int) $recipient['id'],
                    'failed',
                    (string) ($result['message'] ?? 'Ошибка отправки письма')
                );

                continue;
            }

            markRecipient($pdo, (int) $recipient['id'], 'sent');
        } catch (Throwable $e) {
            markRecipient($pdo, (int) $recipient['id'], 'failed', $e->getMessage());
        }
    }

    $stats = refreshMailingCounters($pdo, $mailingId);

    successResponse([
        'message' => 'Пачка рассылки обработана',
        'mailing_id' => $mailingId,
        'status' => $stats['status'],
        'processed' => $processed,
        'sent_count' => $stats['sent_count'],
        'failed_count' => $stats['failed_count'],
        'pending_count' => $stats['pending_count'],
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось обработать рассылку', 500, [
        'error' => $e->getMessage(),
    ]);
}
```
