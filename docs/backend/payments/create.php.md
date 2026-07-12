# api/payments/create.php

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

Endpoint создаёт платёж в Ю-Кассе для уже существующей записи в таблице `payments`.

Сценарий:

1. Другой endpoint создаёт локальную запись `payments` со статусом `pending`.
2. Frontend получает `payment_id`.
3. Frontend вызывает `api/payments/create.php`.
4. Backend создаёт платёж в Ю-Кассе.
5. Backend сохраняет `provider_payment_id`.
6. Backend возвращает `confirmation_url`.
7. Frontend перенаправляет пользователя на оплату.

## Метод и URL

```http
POST /api/payments/create.php
```

## Авторизация

Требуется user session.

Endpoint вызывает:

```php
$userId = requireAuth();
```

Пользователь может создать ссылку оплаты только для своего платежа.

## Request

Тело запроса передаётся в формате JSON.

```json
{
  "payment_id": 123,
  "return_url": "https://nativeplaces.ru/account"
}
```

## Request fields

| Поле | Тип | Обязательное | Описание |
|---|---|---:|---|
| `payment_id` | number | да | ID локального платежа из таблицы `payments`. |
| `return_url` | string | нет | URL возврата после оплаты. Если не передан, используется `YOOKASSA_RETURN_URL` или fallback. |

## Environment variables

Endpoint требует переменные окружения:

| Переменная | Назначение |
|---|---|
| `YOOKASSA_SHOP_ID` | ID магазина Ю-Кассы. |
| `YOOKASSA_SECRET_KEY` | Секретный ключ Ю-Кассы. |
| `YOOKASSA_RETURN_URL` | URL возврата по умолчанию. |

Если `YOOKASSA_SHOP_ID` или `YOOKASSA_SECRET_KEY` не заданы, endpoint возвращает `503`.

## Success response

### Вариант 1 — платёж уже оплачен

HTTP `200`

```json
{
  "success": true,
  "data": {
    "message": "Платёж уже оплачен",
    "payment_required": false,
    "payment_id": 123,
    "status": "paid",
    "confirmation_url": null
  }
}
```

### Вариант 2 — создан платёж в Ю-Кассе

HTTP `200`

```json
{
  "success": true,
  "data": {
    "message": "Перенаправляем на оплату",
    "payment_required": true,
    "payment_id": 123,
    "status": "pending",
    "confirmation_url": "https://yoomoney.ru/checkout/payments/v2/contract?..."
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `400` | `Некорректный JSON` | Тело запроса не является JSON-объектом. |
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `422` | `Не указан платеж` | `payment_id` отсутствует или меньше/равен нулю. |
| `404` | `Платёж не найден` | Платёж не найден или не принадлежит пользователю. |
| `502` | `Не удалось создать платёж в Ю-Кассе` | Ошибка cURL при обращении к Ю-Кассе. |
| `502` | `Ю-Касса вернула некорректный ответ` | Ответ Ю-Кассы не является JSON. |
| `502` | `Ю-Касса не приняла платёж` | Ю-Касса вернула HTTP-код вне диапазона `2xx`. |
| `502` | `Ю-Касса не вернула ссылку оплаты` | В ответе нет `id` или `confirmation.confirmation_url`. |
| `503` | `Ю-Касса ещё не настроена` | Не заданы `YOOKASSA_SHOP_ID` или `YOOKASSA_SECRET_KEY`. |
| `500` | `Не удалось создать платёж` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint вызывается только если ранее получен `payment_id`.
- Если `payment_required = true`, нужно открыть/перенаправить пользователя на `confirmation_url`.
- Если `payment_required = false` и `status = paid`, оплату запускать не нужно.
- Если backend вернул `503`, значит платежи не настроены на сервере.
- `return_url` можно передавать со страницы, куда пользователь должен вернуться после оплаты.
- После возврата пользователя frontend должен проверить статус через `api/payments/status.php`.

## Backend notes

- Используется таблица `payments`.
- Платёж выбирается по:
  - `id`;
  - `user_id`.
- Если локальный платёж уже имеет статус `paid`, новый платёж в Ю-Кассе не создаётся.
- Для Ю-Кассы используется endpoint:
  - `https://api.yookassa.ru/v3/payments`.
- Авторизация в Ю-Кассе выполняется через Basic Auth:
  - `shopId:secretKey`.
- Idempotence key:
  - `nativeplaces-payment-{payment_id}`.
- После успешного ответа Ю-Кассы backend сохраняет:
  - `provider_payment_id`;
  - `payment_provider = 'yookassa'`;
  - `status = 'pending'`;
  - `updated_at = NOW()`.

## PHP-код

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();
$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    errorResponse('Некорректный JSON', 400);
}

$paymentId = (int) ($input['payment_id'] ?? 0);
$returnUrl = trim((string) ($input['return_url'] ?? getenv('YOOKASSA_RETURN_URL') ?: ''));

if ($paymentId <= 0) {
    errorResponse('Не указан платеж', 422, [
        'errors' => [
            'payment_id' => 'Не указан платеж',
        ],
    ]);
}

$shopId = getenv('YOOKASSA_SHOP_ID') ?: '';
$secretKey = getenv('YOOKASSA_SECRET_KEY') ?: '';

if ($shopId === '' || $secretKey === '') {
    errorResponse('Ю-Касса ещё не настроена', 503);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            id,
            user_id,
            amount,
            currency,
            payment_provider,
            provider_payment_id,
            status
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

    if ($payment['status'] === 'paid') {
        successResponse([
            'message' => 'Платёж уже оплачен',
            'payment_required' => false,
            'payment_id' => (int) $payment['id'],
            'status' => 'paid',
            'confirmation_url' => null,
        ]);
    }

    $amount = number_format((float) $payment['amount'], 2, '.', '');
    $currency = $payment['currency'] ?: 'RUB';
    $idempotenceKey = 'nativeplaces-payment-' . $paymentId;

    $payload = [
        'amount' => [
            'value' => $amount,
            'currency' => $currency,
        ],
        'capture' => true,
        'confirmation' => [
            'type' => 'redirect',
            'return_url' => $returnUrl !== '' ? $returnUrl : 'https://nativeplaces.ru/account',
        ],
        'description' => 'Оплата тарифа Native Places #' . $paymentId,
        'metadata' => [
            'payment_id' => (string) $paymentId,
            'user_id' => (string) $userId,
        ],
    ];

    $ch = curl_init('https://api.yookassa.ru/v3/payments');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPAUTH => CURLAUTH_BASIC,
        CURLOPT_USERPWD => $shopId . ':' . $secretKey,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Idempotence-Key: ' . $idempotenceKey,
        ],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
        CURLOPT_TIMEOUT => 30,
    ]);

    $raw = curl_exec($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($raw === false || $curlError !== '') {
        errorResponse('Не удалось создать платёж в Ю-Кассе', 502, [
            'error' => $curlError,
        ]);
    }

    $providerResponse = json_decode($raw, true);

    if (!is_array($providerResponse)) {
        errorResponse('Ю-Касса вернула некорректный ответ', 502, [
            'response' => $raw,
        ]);
    }

    if ($httpCode < 200 || $httpCode >= 300) {
        errorResponse('Ю-Касса не приняла платёж', 502, [
            'response' => $providerResponse,
        ]);
    }

    $providerPaymentId = (string) ($providerResponse['id'] ?? '');
    $confirmationUrl = (string) ($providerResponse['confirmation']['confirmation_url'] ?? '');

    if ($providerPaymentId === '' || $confirmationUrl === '') {
        errorResponse('Ю-Касса не вернула ссылку оплаты', 502, [
            'response' => $providerResponse,
        ]);
    }

    $updateStmt = $pdo->prepare("
        UPDATE payments
        SET
            payment_provider = 'yookassa',
            provider_payment_id = :provider_payment_id,
            status = 'pending',
            updated_at = NOW()
        WHERE id = :id
    ");

    $updateStmt->execute([
        'provider_payment_id' => $providerPaymentId,
        'id' => $paymentId,
    ]);

    successResponse([
        'message' => 'Перенаправляем на оплату',
        'payment_required' => true,
        'payment_id' => $paymentId,
        'status' => 'pending',
        'confirmation_url' => $confirmationUrl,
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось создать платёж', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Документ структурирован по актуальному коду с хоста. |