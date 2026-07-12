# api/my-subscription/change.php

## Статус

| Поле | Значение |
|---|---|
| Backend на хосте | да |
| Код сверено с хостом | да |
| Источник | `php-after-changes/api-my-subscription-updated.md` |
| Подключено на фронте | уточнить |
| Нужны правки backend | нет |
| Нужны правки frontend | уточнить |

## Назначение

Endpoint меняет тариф текущего авторизованного пользователя.

Логика зависит от цены выбранного тарифа:

- если тариф платный, создаётся запись в `payments` со статусом `pending`, а подписка сразу не меняется;
- если тариф бесплатный или промо, текущая активная подписка отменяется и создаётся новая активная подписка.

## Метод и URL

```http
POST /api/my-subscription/change.php
```

## Авторизация

Требуется user session.

Endpoint вызывает:

```php
$userId = requireAuth();
```

Если пользователь не авторизован, backend должен вернуть `401`.

## Request

Тело запроса передаётся в формате JSON.

```json
{
  "plan_id": 1
}
```

## Request fields

| Поле | Тип | Обязательное | Правила |
|---|---|---:|---|
| `plan_id` | number | да | ID активного тарифа из таблицы `plans`. |

## Success response

### Вариант 1 — выбран платный тариф

HTTP `200`

```json
{
  "success": true,
  "data": {
    "message": "Для смены тарифа требуется оплата",
    "payment_required": true,
    "payment_id": 123,
    "confirmation_url": null,
    "subscription": null,
    "plan": {
      "id": 2,
      "code": "business",
      "title": "Бизнес",
      "description": "Описание тарифа",
      "max_places": 50,
      "duration_days": 30,
      "price": 990,
      "is_active": 1
    },
    "usage": {
      "used": 2,
      "limit": 50,
      "remaining": 48
    },
    "available_plans": []
  }
}
```

В этом варианте frontend должен использовать `payment_id` и следующий платёжный endpoint для получения ссылки оплаты.

### Вариант 2 — выбран бесплатный или промо-тариф

HTTP `200`

```json
{
  "success": true,
  "data": {
    "message": "Тариф успешно изменён",
    "payment_required": false,
    "payment_id": null,
    "confirmation_url": null,
    "subscription": {
      "id": 10,
      "status": "active",
      "source": "promo",
      "starts_at": "2026-07-04 10:00:00",
      "expires_at": "2026-11-01 10:00:00"
    },
    "plan": {
      "id": 1,
      "code": "promo",
      "title": "Промо",
      "description": "Описание тарифа",
      "max_places": 10,
      "duration_days": 120,
      "price": 0,
      "is_active": 1
    },
    "usage": {
      "used": 2,
      "limit": 10,
      "remaining": 8
    },
    "available_plans": []
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `400` | `Некорректный JSON` | Тело запроса не является корректным JSON-объектом. |
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `422` | `Выберите тариф` | `plan_id` отсутствует или меньше/равен нулю. |
| `422` | `Тариф не найден или отключён` | Тариф не найден или `is_active != 1`. |
| `422` | `По выбранному тарифу лимит меньше текущего количества объявлений` | У пользователя больше активных объявлений, чем разрешает выбранный тариф. |
| `500` | `Не удалось сменить тариф` | Неожиданная ошибка backend-а или базы данных. |

## Validation details

Если `plan_id` не передан:

```json
{
  "success": false,
  "message": "Выберите тариф",
  "extra": {
    "errors": {
      "plan_id": "Выберите тариф"
    }
  }
}
```

Если тариф не найден или отключён:

```json
{
  "success": false,
  "message": "Тариф не найден или отключён",
  "extra": {
    "errors": {
      "plan_id": "Выберите активный тариф"
    }
  }
}
```

Если лимит выбранного тарифа меньше текущего количества объявлений:

```json
{
  "success": false,
  "message": "По выбранному тарифу лимит меньше текущего количества объявлений",
  "extra": {
    "errors": {
      "plan_id": "Выберите тариф с большим лимитом или перенесите лишние объявления в архив"
    },
    "limit": 5,
    "used": 7
  }
}
```

## Frontend notes

- Endpoint используется на странице смены тарифа в личном кабинете.
- Перед вызовом нужно знать выбранный `plan_id`.
- Если backend возвращает `payment_required = true`, frontend должен перейти к платежному сценарию.
- В ответе для платного тарифа `confirmation_url = null`; ссылку оплаты должен вернуть отдельный endpoint платежей.
- Если `payment_required = false`, тариф считается изменённым сразу.
- После успешной смены бесплатного/промо-тарифа нужно обновить текущую подписку пользователя.
- Если backend вернул ошибку лимита, нужно показать пользователю текущий `used` и лимит выбранного тарифа.
- При `401` нужно отправить пользователя на login.

## Backend notes

- Используются таблицы:
  - `plans`;
  - `places`;
  - `payments`;
  - `user_subscriptions`.
- Сначала backend проверяет, что выбранный тариф существует и активен.
- Затем считает объявления пользователя со статусами:
  - `pending`;
  - `published`;
  - `rejected`.
- Если `max_places > 0` и `usedPlaces > maxPlaces`, смена тарифа запрещается.
- Если `duration_days > 0`, рассчитывается `expires_at`.
- Для платного тарифа:
  - создаётся запись в `payments`;
  - `currency = RUB`;
  - `payment_provider = yookassa`;
  - `status = pending`;
  - активная подписка сразу не меняется.
- Для бесплатного или промо-тарифа:
  - старые активные подписки пользователя переводятся в `cancelled`;
  - создаётся новая активная подписка.
- Для бесплатного/промо-тарифа source определяется так:
  - `promo`, если `duration_days > 0`;
  - `free_forever`, если `duration_days <= 0`.
- Операции выполняются внутри транзакции.
- При исключении транзакция откатывается через `rollBack()`.

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

$planId = (int) ($input['plan_id'] ?? 0);

if ($planId <= 0) {
    errorResponse('Выберите тариф', 422, [
        'errors' => [
            'plan_id' => 'Выберите тариф',
        ],
    ]);
}

try {
    $pdo = getDatabaseConnection();

    $planStmt = $pdo->prepare("
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
        WHERE id = :id
        AND is_active = 1
        LIMIT 1
    ");

    $planStmt->execute([
        'id' => $planId,
    ]);

    $plan = $planStmt->fetch();

    if (!$plan) {
        errorResponse('Тариф не найден или отключён', 422, [
            'errors' => [
                'plan_id' => 'Выберите активный тариф',
            ],
        ]);
    }

    $maxPlaces = (int) ($plan['max_places'] ?? 0);
    $durationDays = (int) ($plan['duration_days'] ?? 0);
    $price = (float) ($plan['price'] ?? 0);

    $activePlacesStmt = $pdo->prepare("
        SELECT COUNT(*)
        FROM places
        WHERE user_id = :user_id
        AND status IN ('pending', 'published', 'rejected')
    ");

    $activePlacesStmt->execute([
        'user_id' => $userId,
    ]);

    $usedPlaces = (int) $activePlacesStmt->fetchColumn();

    if ($maxPlaces > 0 && $usedPlaces > $maxPlaces) {
        errorResponse('По выбранному тарифу лимит меньше текущего количества объявлений', 422, [
            'errors' => [
                'plan_id' => 'Выберите тариф с большим лимитом или перенесите лишние объявления в архив',
            ],
            'limit' => $maxPlaces,
            'used' => $usedPlaces,
        ]);
    }

    $expiresAt = null;

    if ($durationDays > 0) {
        $expiresAt = (new DateTimeImmutable())
            ->modify('+' . $durationDays . ' days')
            ->format('Y-m-d H:i:s');
    }

    $pdo->beginTransaction();

    if ($price > 0) {
        $paymentStmt = $pdo->prepare("
            INSERT INTO payments (
                user_id,
                plan_id,
                amount,
                currency,
                payment_provider,
                status,
                created_at,
                updated_at
            ) VALUES (
                :user_id,
                :plan_id,
                :amount,
                'RUB',
                'yookassa',
                'pending',
                NOW(),
                NOW()
            )
        ");

        $paymentStmt->execute([
            'user_id' => $userId,
            'plan_id' => $planId,
            'amount' => $price,
        ]);

        $paymentId = (int) $pdo->lastInsertId();

        $pdo->commit();

        successResponse([
            'message' => 'Для смены тарифа требуется оплата',
            'payment_required' => true,
            'payment_id' => $paymentId,
            'confirmation_url' => null,
            'subscription' => null,
            'plan' => [
                'id' => (int) $plan['id'],
                'code' => $plan['code'],
                'title' => $plan['title'],
                'description' => $plan['description'],
                'max_places' => $maxPlaces,
                'duration_days' => $durationDays,
                'price' => $price,
                'is_active' => (int) $plan['is_active'],
            ],
            'usage' => [
                'used' => $usedPlaces,
                'limit' => $maxPlaces,
                'remaining' => $maxPlaces > 0 ? max(0, $maxPlaces - $usedPlaces) : 0,
            ],
            'available_plans' => [],
        ]);
    }

    $cancelStmt = $pdo->prepare("
        UPDATE user_subscriptions
        SET
            status = 'cancelled',
            updated_at = NOW()
        WHERE user_id = :user_id
        AND status = 'active'
    ");

    $cancelStmt->execute([
        'user_id' => $userId,
    ]);

    $subscriptionStmt = $pdo->prepare("
        INSERT INTO user_subscriptions (
            user_id,
            plan_id,
            source,
            status,
            starts_at,
            expires_at,
            created_at,
            updated_at
        ) VALUES (
            :user_id,
            :plan_id,
            :source,
            'active',
            NOW(),
            :expires_at,
            NOW(),
            NOW()
        )
    ");

    $subscriptionStmt->execute([
        'user_id' => $userId,
        'plan_id' => $planId,
        'source' => $durationDays > 0 ? 'promo' : 'free_forever',
        'expires_at' => $expiresAt,
    ]);

    $subscriptionId = (int) $pdo->lastInsertId();

    $plansStmt = $pdo->query("
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
        ORDER BY price ASC, max_places ASC, id ASC
    ");

    $availablePlans = $plansStmt->fetchAll();

    $pdo->commit();

    successResponse([
        'message' => 'Тариф успешно изменён',
        'payment_required' => false,
        'payment_id' => null,
        'confirmation_url' => null,
        'subscription' => [
            'id' => $subscriptionId,
            'status' => 'active',
            'source' => $durationDays > 0 ? 'promo' : 'free_forever',
            'starts_at' => date('Y-m-d H:i:s'),
            'expires_at' => $expiresAt,
        ],
        'plan' => [
            'id' => (int) $plan['id'],
            'code' => $plan['code'],
            'title' => $plan['title'],
            'description' => $plan['description'],
            'max_places' => $maxPlaces,
            'duration_days' => $durationDays,
            'price' => $price,
            'is_active' => (int) $plan['is_active'],
        ],
        'usage' => [
            'used' => $usedPlaces,
            'limit' => $maxPlaces,
            'remaining' => $maxPlaces > 0 ? max(0, $maxPlaces - $usedPlaces) : 0,
        ],
        'available_plans' => $availablePlans,
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось сменить тариф', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Документ структурирован из `php-after-changes/api-my-subscription-updated.md`. |