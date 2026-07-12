# api/admin/payments/show.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Payments |
| Тип | PHP endpoint |
| Авторизация | Требуется admin session |
| Middleware | `requireAdmin()` |
| Источник | Код с хоста `api/admin/payments/show.php` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Возвращает подробную карточку платежа для административной панели.

Endpoint отдаёт:

- данные платежа;
- данные пользователя;
- данные связанной подписки;
- данные тарифа.

## Метод и URL

```http
GET /api/admin/payments/show.php?id=1
```

## Авторизация

Требуется административная сессия.

Проверка выполняется через:

```php
requireAdmin();
```

Важно: endpoint доступен именно администратору. Модератору доступ не выдаётся.

## Query params

| Параметр | Тип | Обязательный | Описание |
|---|---:|---:|---|
| `id` | number | да | ID платежа |

## Success response

```json
{
  "success": true,
  "payment": {
    "id": 1,
    "user_id": 15,
    "subscription_id": 7,
    "amount": "990.00",
    "currency": "RUB",
    "payment_provider": "yookassa",
    "provider_payment_id": "2abc...",
    "status": "paid",
    "paid_at": "2026-07-05 12:00:00",
    "created_at": "2026-07-05 11:55:00",
    "updated_at": "2026-07-05 12:00:00",
    "user_email": "user@example.com",
    "user_first_name": "Иван",
    "user_last_name": "Иванов",
    "user_phone": "+79990000000",
    "user_telegram": "@user",
    "plan_id": 2,
    "subscription_status": "active",
    "subscription_source": "payment",
    "starts_at": "2026-07-05 12:00:00",
    "expires_at": "2026-08-04 12:00:00",
    "plan_title": "Pro",
    "plan_code": "pro",
    "duration_days": 30,
    "max_places": 10
  }
}
```

## Структура `payment`

| Поле | Тип | Описание |
|---|---:|---|
| `id` | number | ID платежа |
| `user_id` | number/null | ID пользователя |
| `subscription_id` | number/null | ID подписки |
| `amount` | string/number | Сумма платежа |
| `currency` | string | Валюта |
| `payment_provider` | string/null | Провайдер оплаты |
| `provider_payment_id` | string/null | ID платежа у провайдера |
| `status` | string | Статус платежа |
| `paid_at` | string/null | Дата оплаты |
| `created_at` | string | Дата создания |
| `updated_at` | string/null | Дата обновления |
| `user_email` | string/null | Email пользователя |
| `user_first_name` | string/null | Имя пользователя |
| `user_last_name` | string/null | Фамилия пользователя |
| `user_phone` | string/null | Телефон пользователя |
| `user_telegram` | string/null | Telegram пользователя |
| `plan_id` | number/null | ID тарифа |
| `subscription_status` | string/null | Статус подписки |
| `subscription_source` | string/null | Источник подписки |
| `starts_at` | string/null | Дата начала подписки |
| `expires_at` | string/null | Дата окончания подписки |
| `plan_title` | string/null | Название тарифа |
| `plan_code` | string/null | Код тарифа |
| `duration_days` | number/null | Длительность тарифа в днях |
| `max_places` | number/null | Лимит мест по тарифу |

## Error responses

### 422 — не передан ID платежа

```json
{
  "success": false,
  "message": "Не передан ID платежа"
}
```

### 404 — платёж не найден

```json
{
  "success": false,
  "message": "Платёж не найден"
}
```

### 401 / 403 — нет доступа

Формируется в `requireAdmin()`.

Точный формат зависит от реализации `api/admin/shared/require-admin.php`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось получить платёж",
  "error": "..."
}
```

## Frontend notes

- Используется для карточки платежа в админке.
- Можно показать:
  - данные платежа;
  - данные пользователя;
  - тариф;
  - подписку;
  - ID платежа у провайдера.
- Endpoint только читает данные, статус платежа не меняет.
- Модераторам этот раздел недоступен, потому что используется `requireAdmin()`.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdmin()`.
- Подключение к базе фактически приходит через `require-admin.php`.
- Платёж берётся из таблицы `payments`.
- Пользователь подтягивается из `users`.
- Подписка подтягивается из `user_subscriptions`.
- Тариф подтягивается из `plans`.
- Endpoint не пишет moderator-log, потому что только читает данные.

## PHP-код

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdmin();

$paymentId = (int) ($_GET['id'] ?? 0);

if ($paymentId <= 0) {
    errorResponse('Не передан ID платежа', 422);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            p.id,
            p.user_id,
            p.subscription_id,
            p.amount,
            p.currency,
            p.payment_provider,
            p.provider_payment_id,
            p.status,
            p.paid_at,
            p.created_at,
            p.updated_at,

            u.email AS user_email,
            u.first_name AS user_first_name,
            u.last_name AS user_last_name,
            u.phone AS user_phone,
            u.telegram AS user_telegram,

            us.plan_id,
            us.status AS subscription_status,
            us.source AS subscription_source,
            us.starts_at,
            us.expires_at,

            pl.title AS plan_title,
            pl.code AS plan_code,
            pl.duration_days,
            pl.max_places
        FROM payments p
        LEFT JOIN users u
            ON u.id = p.user_id
        LEFT JOIN user_subscriptions us
            ON us.id = p.subscription_id
        LEFT JOIN plans pl
            ON pl.id = us.plan_id
        WHERE p.id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $paymentId,
    ]);

    $payment = $stmt->fetch();

    if (!$payment) {
        errorResponse('Платёж не найден', 404);
    }

    successResponse([
        'payment' => $payment,
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить платёж', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-05 | Файл оформлен по коду с хоста и перенесён в структуру `docs/backend/admin/payments`. |