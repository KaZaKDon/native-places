# api/admin/mailings/preview.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Mailings |
| Тип | PHP endpoint |
| Авторизация | Требуется admin session |
| Middleware | `requireAdmin()` |
| Источник | Код с хоста `api/admin/mailings/preview.php` |
| Готовность | Актуализировано по коду с хоста |

## Назначение

Рассчитывает количество получателей рассылки для выбранной аудитории.

Endpoint не создаёт рассылку и не отправляет письма.

## Метод и URL

```http
POST /api/admin/mailings/preview.php
```

## Авторизация

```php
requireAdmin();
```

Endpoint доступен только администратору.

## Request

```json
{
  "audience_type": "all",
  "audience_value": ""
}
```

## Audience types

| Значение | Требует `audience_value` | Описание |
|---|---:|---|
| `all` | нет | Все активные пользователи с email |
| `moderators` | нет | Активные пользователи с ролью `moderator` |
| `role` | да | По коду роли |
| `category` | да | По категории объявлений |
| `plan` | да | По тарифу |

## Success response

```json
{
  "success": true,
  "audience_type": "all",
  "audience_value": "",
  "recipients_count": 100
}
```

## Error responses

### 422 — не выбрано значение аудитории

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

### 422 — неизвестный тип аудитории

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
  "message": "Не удалось рассчитать получателей",
  "error": "..."
}
```

## Frontend notes

- Используется перед созданием рассылки.
- Позволяет показать администратору количество получателей.
- Для `role`, `category`, `plan` нужно передавать `audience_value`.

## Backend notes

- Использует `requireAdmin()`.
- В выборку попадают только пользователи:
  - `u.status = 'active'`;
  - `u.email IS NOT NULL`;
  - `u.email <> ''`.
- Получатели выбираются через `SELECT DISTINCT`.

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

$audienceType = trim($input['audience_type'] ?? 'all');
$audienceValue = trim($input['audience_value'] ?? '');

try {
    $pdo = getDatabaseConnection();

    [$sql, $params] = buildRecipientsQuery(
        $audienceType,
        $audienceValue
    );

    $stmt = $pdo->prepare("
        SELECT COUNT(*) AS total
        FROM (
            {$sql}
        ) recipients
    ");

    $stmt->execute($params);

    $total = (int) $stmt->fetch()['total'];

    successResponse([
        'audience_type' => $audienceType,
        'audience_value' => $audienceValue,
        'recipients_count' => $total,
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось рассчитать получателей', 500, [
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