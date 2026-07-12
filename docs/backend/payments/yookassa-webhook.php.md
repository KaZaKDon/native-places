# api/payments/yookassa-webhook.php

## Статус

| Поле | Значение |
|---|---|
| Backend на хосте | да |
| Код сверено с хостом | да |
| Источник | код с хоста, присланный вручную |
| Подключено на фронте | не используется напрямую |
| Нужны правки backend | нет |
| Нужны правки frontend | нет |

## Назначение

Endpoint принимает webhook от Ю-Кассы и обновляет локальный статус платежа.

Поддерживаемые состояния:

| Событие/статус Ю-Кассы | Локальный статус |
|---|---|
| `payment.succeeded` или `succeeded` | `paid` |
| `payment.canceled` или `canceled` | `failed` |
| Остальное | `pending` |

## Метод и URL

```http
POST /api/payments/yookassa-webhook.php
```

## Авторизация

User session не требуется.

Endpoint вызывается Ю-Кассой.

## Request

Тело запроса передаётся в формате JSON от Ю-Кассы.

Пример:

```json
{
  "event": "payment.succeeded",
  "object": {
    "id": "2f6...",
    "status": "succeeded",
    "metadata": {
      "payment_id": "123",
      "user_id": "10"
    }
  }
}
```

## Request fields

| Поле | Тип | Описание |
|---|---|---|
| `event` | string | Событие Ю-Кассы. |
| `object.id` | string | ID платежа в Ю-Кассе. |
| `object.status` | string | Статус платежа в Ю-Кассе. |
| `object.metadata.payment_id` | string/number | Локальный ID платежа. |

## Success response

HTTP `200`

```json
{
  "success": true,
  "data": {
    "received": true,
    "payment_id": 123,
    "status": "paid"
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `400` | `Некорректный JSON` | Тело запроса не является JSON-объектом. |
| `422` | `Не указан платеж Ю-Кассы` | Нет ни `object.id`, ни `metadata.payment_id`. |
| `404` | `Платёж не найден` | Локальный платёж не найден. |
| `500` | `Не удалось обработать webhook оплаты` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Frontend напрямую этот endpoint не вызывает.
- После возврата пользователя из Ю-Кассы frontend должен вызывать `api/payments/status.php`.
- Статус оплаты на фронте нужно считать по локальному статусу из backend-а, а не напрямую по Ю-Кассе.

## Backend notes

- Используется таблица `payments`.
- Поиск платежа выполняется:
  - по `metadata.payment_id`, если он есть;
  - иначе по `provider_payment_id`.
- Запись платежа блокируется через:
  - `FOR UPDATE`.
- Операция выполняется в транзакции.
- При `paid` заполняется:
  - `paid_at = NOW()`.
- При любом событии обновляется:
  - `provider_payment_id`;
  - `status`;
  - `updated_at`.
- В текущем коде webhook обновляет только таблицу `payments`.
- Если после оплаты нужно менять `places.payment_status`, `user_subscriptions` или другие сущности, это должно быть добавлено отдельной backend-логикой.

## PHP-код

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    errorResponse('Некорректный JSON', 400);
}

$event = (string) ($input['event'] ?? '');
$object = $input['object'] ?? [];
$providerPaymentId = (string) ($object['id'] ?? '');
$providerStatus = (string) ($object['status'] ?? '');
$metadataPaymentId = (int) ($object['metadata']['payment_id'] ?? 0);

if ($providerPaymentId === '' && $metadataPaymentId <= 0) {
    errorResponse('Не указан платеж Ю-Кассы', 422);
}

$status = 'pending';

if ($event === 'payment.succeeded' || $providerStatus === 'succeeded') {
    $status = 'paid';
} elseif ($event === 'payment.canceled' || $providerStatus === 'canceled') {
    $status = 'failed';
}

try {
    $pdo = getDatabaseConnection();
    $pdo->beginTransaction();

    $where = $metadataPaymentId > 0
        ? 'id = :payment_id'
        : 'provider_payment_id = :provider_payment_id';

    $stmt = $pdo->prepare("
        SELECT id, status
        FROM payments
        WHERE {$where}
        LIMIT 1
        FOR UPDATE
    ");

    if ($metadataPaymentId > 0) {
        $stmt->execute(['payment_id' => $metadataPaymentId]);
    } else {
        $stmt->execute(['provider_payment_id' => $providerPaymentId]);
    }

    $payment = $stmt->fetch();

    if (!$payment) {
        $pdo->rollBack();
        errorResponse('Платёж не найден', 404);
    }

    $updateStmt = $pdo->prepare("
        UPDATE payments
        SET
            provider_payment_id = COALESCE(NULLIF(:provider_payment_id, ''), provider_payment_id),
            status = :status,
            paid_at = CASE WHEN :status = 'paid' THEN NOW() ELSE paid_at END,
            updated_at = NOW()
        WHERE id = :id
    ");

    $updateStmt->execute([
        'provider_payment_id' => $providerPaymentId,
        'status' => $status,
        'id' => (int) $payment['id'],
    ]);

    $pdo->commit();

    successResponse([
        'received' => true,
        'payment_id' => (int) $payment['id'],
        'status' => $status,
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось обработать webhook оплаты', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Документ структурирован по актуальному коду с хоста. |