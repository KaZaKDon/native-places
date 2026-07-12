# api/admin/mailings/send.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Mailings |
| Тип | PHP endpoint |
| Авторизация | Требуется admin session |
| Middleware | `requireAdmin()` |
| Источник | Код с хоста `api/admin/mailings/send.php` |
| Готовность | Актуализировано по коду с хоста |

## Назначение

Создаёт рассылку как черновик и формирует список получателей.

Важно: несмотря на название `send.php`, текущий код **не отправляет письма сразу**. Он создаёт:

- запись в `mailings` со статусом `draft`;
- записи в `mailing_recipients` со статусом `pending`.

## Метод и URL

```http
POST /api/admin/mailings/send.php
```

## Авторизация

```php
requireAdmin();
```

Endpoint доступен только администратору.

## Request

```json
{
  "subject": "Новость",
  "body": "Текст рассылки",
  "audience_type": "all",
  "audience_value": ""
}
```

## Success response

Код ответа: `201`.

```json
{
  "success": true,
  "message": "Рассылка создана как черновик",
  "mailing_id": 1,
  "recipients_count": 100,
  "status": "draft"
}
```

## Error responses

### 422 — нет темы

```json
{
  "success": false,
  "message": "Введите тему рассылки"
}
```

### 422 — нет текста

```json
{
  "success": false,
  "message": "Введите текст рассылки"
}
```

### 422 — нет получателей

```json
{
  "success": false,
  "message": "Для выбранной аудитории нет получателей"
}
```

### 422 — ошибки аудитории

```json
{
  "success": false,
  "message": "Выберите роль"
}
```

```json
{
  "success": false,
  "message": "Выберите категорию"
}
```

```json
{
  "success": false,
  "message": "Выберите тариф"
}
```

```json
{
  "success": false,
  "message": "Неизвестный тип аудитории"
}
```

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось создать рассылку",
  "error": "..."
}
```

## Frontend notes

- Перед созданием удобно вызвать `preview.php`.
- После успешного ответа рассылка имеет статус `draft`.
- Реальной отправки писем в этом коде нет.
- Для удаления черновика использовать `delete.php`.
- Модераторам рассылки недоступны.

## Backend notes

- Использует `requireAdmin()`.
- Получатели выбираются через `buildRecipientsQuery()`.
- Создание рассылки и получателей выполняется в транзакции.
- При ошибке транзакция откатывается.
- `created_by_name` берётся из `getCurrentAdminUser()`.
- Если имя отсутствует, используется `Администратор`.

## PHP-код

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdmin();

$input = json_decode(
    file_get_contents('php://input'),
    true
);

$subject = trim($input['subject'] ?? '');
$body = trim($input['body'] ?? '');
$audienceType = trim($input['audience_type'] ?? 'all');
$audienceValue = trim($input['audience_value'] ?? '');

if ($subject === '') {
    errorResponse('Введите тему рассылки', 422);
}

if ($body === '') {
    errorResponse('Введите текст рассылки', 422);
}

try {
    $pdo = getDatabaseConnection();

    [$recipientsSql, $recipientsParams] = buildRecipientsQuery(
        $audienceType,
        $audienceValue
    );

    $recipientsStmt = $pdo->prepare($recipientsSql);
    $recipientsStmt->execute($recipientsParams);
    $recipients = $recipientsStmt->fetchAll();

    if (count($recipients) === 0) {
        errorResponse('Для выбранной аудитории нет получателей', 422);
    }

    $adminUser = getCurrentAdminUser();

    $pdo->beginTransaction();

    $mailingStmt = $pdo->prepare("
        INSERT INTO mailings (
            subject,
            body,
            audience_type,
            audience_value,
            status,
            recipients_count,
            sent_count,
            failed_count,
            created_by_name,
            created_at
        ) VALUES (
            :subject,
            :body,
            :audience_type,
            :audience_value,
            'draft',
            :recipients_count,
            0,
            0,
            :created_by_name,
            NOW()
        )
    ");

    $mailingStmt->execute([
        'subject' => $subject,
        'body' => $body,
        'audience_type' => $audienceType,
        'audience_value' => $audienceValue !== '' ? $audienceValue : null,
        'recipients_count' => count($recipients),
        'created_by_name' => $adminUser['name'] ?? 'Администратор',
    ]);

    $mailingId = (int) $pdo->lastInsertId();

    $recipientStmt = $pdo->prepare("
        INSERT INTO mailing_recipients (
            mailing_id,
            user_id,
            email,
            status,
            created_at
        ) VALUES (
            :mailing_id,
            :user_id,
            :email,
            'pending',
            NOW()
        )
    ");

    foreach ($recipients as $recipient) {
        $recipientStmt->execute([
            'mailing_id' => $mailingId,
            'user_id' => (int) $recipient['id'],
            'email' => $recipient['email'],
        ]);
    }

    $pdo->commit();

    successResponse([
        'message' => 'Рассылка создана как черновик',
        'mailing_id' => $mailingId,
        'recipients_count' => count($recipients),
        'status' => 'draft',
    ], 201);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось создать рассылку', 500, [
        'error' => $e->getMessage(),
    ]);
}

function buildRecipientsQuery(string $audienceType, string $audienceValue): array
{
    $baseSelect = "
        SELECT DISTINCT
            u.id,
            u.email
        FROM users u
    ";

    $baseWhere = "
        WHERE u.status = 'active'
        AND u.email IS NOT NULL
        AND u.email <> ''
    ";

    if ($audienceType === 'all') {
        return [
            $baseSelect . $baseWhere,
            [],
        ];
    }

    if ($audienceType === 'moderators') {
        return [
            $baseSelect . "
                INNER JOIN roles r
                    ON r.id = u.role_id
                " . $baseWhere . "
                AND r.code = 'moderator'
            ",
            [],
        ];
    }

    if ($audienceType === 'role') {
        if ($audienceValue === '') {
            errorResponse('Выберите роль', 422);
        }

        return [
            $baseSelect . "
                INNER JOIN roles r
                    ON r.id = u.role_id
                " . $baseWhere . "
                AND r.code = :role_code
            ",
            [
                'role_code' => $audienceValue,
            ],
        ];
    }

    if ($audienceType === 'category') {
        if ($audienceValue === '') {
            errorResponse('Выберите категорию', 422);
        }

        return [
            $baseSelect . "
                INNER JOIN places p
                    ON p.user_id = u.id
                INNER JOIN categories c
                    ON c.id = p.category_id
                " . $baseWhere . "
                AND c.code = :category_code
            ",
            [
                'category_code' => $audienceValue,
            ],
        ];
    }

    if ($audienceType === 'plan') {
        if ($audienceValue === '') {
            errorResponse('Выберите тариф', 422);
        }

        return [
            $baseSelect . "
                INNER JOIN user_subscriptions us
                    ON us.user_id = u.id
                INNER JOIN plans p
                    ON p.id = us.plan_id
                " . $baseWhere . "
                AND p.code = :plan_code
            ",
            [
                'plan_code' => $audienceValue,
            ],
        ];
    }

    errorResponse('Неизвестный тип аудитории', 422);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-05 | Файл актуализирован по коду с хоста. |