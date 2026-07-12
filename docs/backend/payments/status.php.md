# api/payments/status.php

## Статус

| Поле | Значение |
|---|---|
| Backend на хосте | да |
| Код сверено с хостом | да |
| Источник | код с хоста, присланный вручную |
| Подключено на фронте | уточнить |
| Нужны правки backend | нет |
| Нужны правки frontend | уточнить |

## Назначение

Endpoint возвращает текущий статус платежа пользователя.

Используется после возврата пользователя из Ю-Кассы или для ручной проверки состояния платежа.

## Метод и URL

```http
GET /api/payments/status.php?payment_id={id}
```

## Авторизация

Требуется user session.

Endpoint вызывает:

```php
$userId = requireAuth();
```

Пользователь может проверить только свой платёж.

## Query params

| Параметр | Тип | Обязательный | Описание |
|---|---|---:|---|
| `payment_id` | number | да | ID локального платежа. |

## Success response

HTTP `200`

```json
{
  "success": true,
  "data": {
    "payment_id": 123,
    "payment_required": true,
    "status": "pending",
    "amount": 990,
    "currency": "RUB",
    "paid_at": null,
    "created_at": "2026-07-04 10:00:00",
    "updated_at": "2026-07-04 10:05:00",
    "confirmation_url": null
  }
}
```

Если платёж оплачен:

```json
{
  "success": true,
  "data": {
    "payment_id": 123,
    "payment_required": false,
    "status": "paid",
    "amount": 990,
    "currency": "RUB",
    "paid_at": "2026-07-04 10:10:00",
    "created_at": "2026-07-04 10:00:00",
    "updated_at": "2026-07-04 10:10:00",
    "confirmation_url": null
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `422` | `Не указан платеж` | `payment_id` отсутствует или меньше/равен нулю. |
| `404` | `Платёж не найден` | Платёж не найден или не принадлежит пользователю. |
| `500` | `Не удалось проверить платёж` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint вызывать после возврата пользователя с оплаты.
- Если `payment_required = false` и `status = paid`, оплату можно считать завершённой.
- Если `status = pending`, можно показать ожидание оплаты или предложить проверить позже.
- `confirmation_url` здесь всегда `null`; ссылку оплаты выдаёт `api/payments/create.php`.
- При `401` отправить пользователя на login.

## Backend notes

- Используется таблица `payments`.
- Платёж выбирается по:
  - `id`;
  - `user_id`.
- `payment_required` вычисляется как:
  - `status !== 'paid'`.

## PHP-код

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();
$paymentId = (int) ($_GET['payment_id'] ?? 0);

if ($paymentId <= 0) {
    errorResponse('Не указан платеж', 422);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            id,
            amount,
            currency,
            status,
            paid_at,
            created_at,
            updated_at
        FROM payments
        WHERE id = :id
        AND user_id = :user_id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $paymentId,
        'user_id' => $userId,
    ]);

    $payment = $stmt->fetch();

    if (!$payment) {
        errorResponse('Платёж не найден', 404);
    }

    successResponse([
        'payment_id' => (int) $payment['id'],
        'payment_required' => $payment['status'] !== 'paid',
        'status' => $payment['status'],
        'amount' => (float) $payment['amount'],
        'currency' => $payment['currency'],
        'paid_at' => $payment['paid_at'],
        'created_at' => $payment['created_at'],
        'updated_at' => $payment['updated_at'],
        'confirmation_url' => null,
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось проверить платёж', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Документ структурирован по актуальному коду с хоста. |