<<<<<<< HEAD
# api/plans и api/payments — рабочий платежный контур

Дата: 2026-07-03

## Что добавляем сейчас

Тарифы уже выбираются в форме создания объекта и в личном кабинете. Следующий шаг — отдельный платежный контур, который отдаёт фронтенду ссылку оплаты и позволяет проверить статус платежа.

Минимальный набор файлов на хосте:

```txt
api/plans/index.php
api/payments/create.php
api/payments/status.php
api/payments/yookassa-webhook.php
```

Фронтенд ожидает такой контракт:

```json
{
  "success": true,
  "data": {
    "payment_required": true,
    "payment_id": 123,
    "status": "pending",
    "confirmation_url": "https://yoomoney.ru/checkout/payments/v2/contract?...",
    "message": "Перенаправляем на оплату"
  }
}
```

Если тариф бесплатный или промо, `api/my-subscription/change.php` / `api/my-places/create.php` могут сразу вернуть `payment_required = false`. Если тариф платный, они создают `payments.status = pending`, возвращают `payment_id`, а фронтенд вызывает `api/payments/create.php` для получения `confirmation_url`.

На фронтенде дополнительно стоит защита: если выбранный тариф имеет `price = 0`, переход в `api/payments/create.php` не запускается даже при ошибочном `payment_required = true`. Это нужно для текущего периода запуска, когда все тарифы действуют бесплатно на 4 месяца.
=======
# api/plans и будущий api/payments — исправленный PHP код и фиксация статуса

Дата: 2026-06-28

## Что сейчас есть

По хосту видно:

- папка `api/plans/` есть;
- папки `api/payments/` нет;
- таблица `plans` есть;
- таблица `payments` есть;
- таблица `user_subscriptions` есть.

Поэтому сейчас исправляем только существующий `api/plans/index.php`, а платежные endpoint-ы не считаем готовыми. Их нужно будет создавать отдельно.
>>>>>>> acd0b371c8ce1ba022cc64d9aa6de5b3e01f28aa

---

## `api/plans/index.php`

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->query("
        SELECT
            id,
            code,
            title,
            description,
            max_places,
            duration_days,
            price,
            is_active
        FROM plans
        WHERE is_active = 1
        ORDER BY price ASC, id ASC
    ");

    successResponse([
        'plans' => $stmt->fetchAll(),
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить тарифы', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

---

<<<<<<< HEAD
## Переменные окружения для Ю-Кассы

Для `api/payments/create.php` и webhook нужны значения:

```txt
YOOKASSA_SHOP_ID=xxxxxx
YOOKASSA_SECRET_KEY=secret
YOOKASSA_RETURN_URL=https://nativeplaces.ru/account
YOOKASSA_WEBHOOK_SECRET=любой_секрет_для_проверки_своего_прокси_или_пусто
```

Если переменных нет, endpoint вернёт понятную ошибку и не будет отдавать некорректный JSON.

---

## `api/payments/create.php`

Файл получает уже созданный `payment_id`, проверяет, что платеж принадлежит текущему пользователю, создаёт платеж в Ю-Кассе и сохраняет `provider_payment_id`.

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
=======
## Что нельзя считать готовым

На хосте сейчас нет папки:

```txt
api/payments/
```

Значит этих файлов пока нет и их нельзя просто править:

```txt
api/payments/create.php
api/payments/status.php
api/payments/yookassa-webhook.php
```

Их нужно будет создавать с нуля после того, как будет утверждён сценарий оплаты.

---

## Что видно по таблице `payments`

По скрину структура такая:

```txt
id
user_id
subscription_id
amount
currency
payment_provider
provider_payment_id
status
paid_at
created_at
updated_at
```

Статусы платежа:

```txt
pending
paid
failed
refunded
```

Эта таблица подходит для хранения платежей Ю-Кассы, потому что есть:

```txt
payment_provider
provider_payment_id
status
paid_at
>>>>>>> acd0b371c8ce1ba022cc64d9aa6de5b3e01f28aa
```

---

<<<<<<< HEAD
## `api/payments/status.php`

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
=======
## Что видно по таблице `user_subscriptions`

По скрину структура такая:

```txt
id
user_id
plan_id
source
status
starts_at
expires_at
created_at
updated_at
```

Статусы подписки:

```txt
active
expired
cancelled
```

Эта таблица подходит для тарифного доступа пользователя: какой тариф активен, когда начался и когда заканчивается.

---

## Какой сценарий оплаты нужен позже

Когда будем создавать `api/payments/`, минимальная схема такая:

```txt
1. Пользователь выбирает тариф из plans.
2. Backend проверяет активный тариф и лимит max_places.
3. Backend создаёт запись user_subscriptions со статусом active только после успешной оплаты.
4. До оплаты создаётся payment со статусом pending.
5. Ю-Касса возвращает provider_payment_id.
6. Webhook Ю-Кассы меняет payments.status на paid.
7. После paid создаётся/продлевается user_subscriptions.
8. Объявление получает срок expires_at на основании plans.duration_days.
>>>>>>> acd0b371c8ce1ba022cc64d9aa6de5b3e01f28aa
```

---

## `api/payments/yookassa-webhook.php`

Webhook фиксирует статус платежа. Если в таблице `payments` есть `subscription_id`, можно дополнительно активировать подписку по этому id. Если подписка создаётся после оплаты по `plan_id`, нужно убедиться, что в таблице `payments` есть поле `plan_id` или отдельная таблица связей.

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

---

<<<<<<< HEAD
## Важно по активации тарифа после оплаты

Сейчас безопасный первый шаг — создать ссылку оплаты и фиксировать `payments.status`. Для полной автоматической активации тарифа после webhook нужно одно из двух:

1. В `payments` добавить `plan_id` и по нему создавать/продлевать `user_subscriptions` после `paid`.
2. Или создавать `user_subscriptions.status = pending` заранее, хранить её `subscription_id` в `payments`, а webhook переводит подписку в `active`.

В текущих PHP-сниппетах `api/my-subscription/change.php` уже возвращает `payment_id` и может быть расширен до одного из этих двух вариантов без изменения фронтенда.
=======
## Утверждённые решения по тарифам

1. Коммерческий тариф с ценой `0 ₽` на период запуска считается коммерческим тарифом: `publication_type = paid`, но `payment_status = not_required`.
2. Тариф выбирается до создания объявления, поэтому `api/my-places/create.php` принимает `plan_id`.
3. Для бесплатных, промо и бессрочных тарифов тоже создаётся запись в `user_subscriptions`, чтобы лимиты считались одинаково.
4. Лимит `plans.max_places` считаем по активным объявлениям пользователя со статусами `pending`, `published`, `rejected`; `expired` в лимит не входит.
5. Тариф на 50 объявлений лучше держать скрытым или выдавать по запросу через админа.
6. Для своих/служебных объявлений можно завести отдельный тариф с `price = 0`, `duration_days = NULL` или `0`, `max_places = 0`; это будет бесплатно и бессрочно.

## Как админ будет управлять тарифами без новой сложной схемы

Текущих полей таблицы `plans` достаточно для первого рабочего варианта:

```txt
max_places      лимит объявлений; 0 можно считать безлимитом
duration_days   срок размещения; NULL или 0 можно считать бессрочно
price           стоимость; 0.00 значит бесплатно
is_active       показывать тариф или нет
```

То есть админ сможет менять срок и стоимость прямо в полях тарифа:

```txt
14 дней / 0 ₽
14 дней / 490 ₽
30 дней / 2990 ₽
0 или NULL дней / 0 ₽ — бесплатно навсегда
365 дней / 0 ₽ — бесплатно на год
```

Для аккуратного UI позже можно добавить `sort_order` и `is_visible`, но базовая логика уже может работать на текущей структуре.
>>>>>>> acd0b371c8ce1ba022cc64d9aa6de5b3e01f28aa
