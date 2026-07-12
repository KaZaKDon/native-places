# api/admin/payments/index.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Payments |
| Тип | PHP endpoint |
| Авторизация | Требуется admin session |
| Middleware | `requireAdmin()` |
| Источник | Код с хоста `api/admin/payments/index.php` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Возвращает список платежей для административной панели.

Endpoint поддерживает фильтр по статусу платежа.

В ответе возвращает массив платежей и применённые фильтры.

## Метод и URL

```http
GET /api/admin/payments/index.php
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
| `status` | string | нет | Фильтр по статусу платежа |

## Allowed statuses

```php
$allowedStatuses = [
    '',
    'pending',
    'waiting',
    'paid',
    'failed',
    'rejected',
];
```

| Статус | Описание |
|---|---|
| пустая строка | Без фильтра по статусу |
| `pending` | Ожидает обработки |
| `waiting` | Ожидает оплаты/подтверждения |
| `paid` | Оплачен |
| `failed` | Ошибка оплаты |
| `rejected` | Отклонён |

## Success response

```json
{
  "success": true,
  "payments": [
    {
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
      "plan_id": 2,
      "subscription_status": "active",
      "subscription_source": "payment",
      "starts_at": "2026-07-05 12:00:00",
      "expires_at": "2026-08-04 12:00:00",
      "plan_title": "Pro",
      "plan_code": "pro"
    }
  ],
  "filters": {
    "status": "paid"
  }
}
```

## Структура `payments[]`

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
| `plan_id` | number/null | ID тарифа |
| `subscription_status` | string/null | Статус подписки |
| `subscription_source` | string/null | Источник подписки |
| `starts_at` | string/null | Дата начала подписки |
| `expires_at` | string/null | Дата окончания подписки |
| `plan_title` | string/null | Название тарифа |
| `plan_code` | string/null | Код тарифа |

## Error responses

### 422 — некорректный статус платежа

```json
{
  "success": false,
  "message": "Некорректный статус платежа"
}
```

### 401 / 403 — нет доступа

Формируется в `requireAdmin()`.

Точный формат зависит от реализации `api/admin/shared/require-admin.php`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось получить платежи",
  "error": "..."
}
```

## Frontend notes

- Используется для таблицы платежей в админке.
- Можно фильтровать по статусу платежа.
- Endpoint возвращает применённые фильтры в `filters`.
- Список уже отсортирован backend-ом:
  - `p.created_at DESC`;
  - `p.id DESC`.
- В текущей версии пагинации нет.
- Для подробной карточки платежа использовать `show.php`.
- Модераторам этот раздел недоступен, потому что используется `requireAdmin()`.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdmin()`.
- Подключение к базе фактически приходит через `require-admin.php`.
- Использует динамическую сборку SQL с подготовленными параметрами.
- Платежи берутся из таблицы `payments`.
- Пользователь подтягивается из `users`.
- Подписка подтягивается из `user_subscriptions`.
- Тариф подтягивается из `plans`.
- Endpoint не использует пагинацию.
- Endpoint не пишет moderator-log, потому что только читает данные.

## PHP-код

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdmin();

$status = trim((string) ($_GET['status'] ?? ''));

$allowedStatuses = [
    '',
    'pending',
    'waiting',
    'paid',
    'failed',
    'rejected',
];

if (!in_array($status, $allowedStatuses, true)) {
    errorResponse('Некорректный статус платежа', 422);
}

try {
    $pdo = getDatabaseConnection();

    $sql = "
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

            us.plan_id,
            us.status AS subscription_status,
            us.source AS subscription_source,
            us.starts_at,
            us.expires_at,

            pl.title AS plan_title,
            pl.code AS plan_code
        FROM payments p
        LEFT JOIN users u
            ON u.id = p.user_id
        LEFT JOIN user_subscriptions us
            ON us.id = p.subscription_id
        LEFT JOIN plans pl
            ON pl.id = us.plan_id
        WHERE 1 = 1
    ";

    $params = [];

    if ($status !== '') {
        $sql .= " AND p.status = :status";
        $params['status'] = $status;
    }

    $sql .= "
        ORDER BY p.created_at DESC, p.id DESC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    successResponse([
        'payments' => $stmt->fetchAll(),
        'filters' => [
            'status' => $status,
        ],
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить платежи', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-05 | Файл оформлен по коду с хоста и перенесён в структуру `docs/backend/admin/payments`. |