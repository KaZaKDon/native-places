# api/my-subscription/current.php

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

Endpoint возвращает текущий активный тариф/подписку авторизованного пользователя.

Также endpoint возвращает:

- текущий активный план;
- использование лимита объявлений;
- список доступных активных тарифов.

Логика: тариф считается подпиской пользователя. В норме у одного пользователя должна быть только одна активная запись:

```text
user_subscriptions.status = 'active'
```

## Метод и URL

```http
GET /api/my-subscription/current.php
```

## Авторизация

Требуется user session.

Endpoint вызывает:

```php
$userId = requireAuth();
```

Если пользователь не авторизован, backend должен вернуть `401`.

## Request

Тело запроса не требуется.

Query-параметры не используются.

## Success response

### Вариант 1 — активная подписка есть

HTTP `200`

```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": 1,
      "status": "active",
      "source": "promo",
      "starts_at": "2026-07-04 10:00:00",
      "expires_at": "2026-11-04 10:00:00",
      "created_at": "2026-07-04 10:00:00",
      "updated_at": "2026-07-04 10:00:00"
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

### Вариант 2 — активной подписки нет

HTTP `200`

```json
{
  "success": true,
  "data": {
    "subscription": null,
    "plan": null,
    "usage": {
      "used": 2,
      "limit": 0,
      "remaining": 0
    },
    "available_plans": []
  }
}
```

## Response fields

### `subscription`

| Поле | Тип | Описание |
|---|---|---|
| `id` | number | ID записи в `user_subscriptions`. |
| `status` | string | Статус подписки. Обычно `active`. |
| `source` | string | Источник подписки, например `promo` или `free_forever`. |
| `starts_at` | string/null | Дата начала подписки. |
| `expires_at` | string/null | Дата окончания подписки. |
| `created_at` | string | Дата создания записи. |
| `updated_at` | string | Дата обновления записи. |

### `plan`

| Поле | Тип | Описание |
|---|---|---|
| `id` | number | ID тарифа. |
| `code` | string | Код тарифа. |
| `title` | string | Название тарифа. |
| `description` | string/null | Описание тарифа. |
| `max_places` | number | Максимальное количество активных объявлений. |
| `duration_days` | number | Срок действия тарифа в днях. |
| `price` | number | Цена тарифа. |
| `is_active` | number | Активен ли тариф. |

### `usage`

| Поле | Тип | Описание |
|---|---|---|
| `used` | number | Сколько объявлений пользователя учитывается в лимите. |
| `limit` | number | Лимит объявлений по текущему тарифу. |
| `remaining` | number | Остаток доступных объявлений. |

### `available_plans`

Массив активных тарифов из таблицы `plans`.

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `500` | `Не удалось получить текущий тариф` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint нужен для страницы тарифа/подписки в личном кабинете.
- Также его можно использовать в форме создания объявления, чтобы понять лимиты пользователя.
- Если `subscription = null`, значит у пользователя нет активного тарифа.
- Если `plan = null`, frontend должен предложить выбрать тариф.
- `usage.used` показывает количество объявлений, которые учитываются в лимите.
- `usage.remaining` можно использовать для UI-индикатора остатка.
- `available_plans` можно использовать для списка тарифов.
- Если `remaining = 0`, frontend может заблокировать создание нового объявления или предложить сменить тариф.
- При `401` нужно отправить пользователя на login.

## Backend notes

- Используются таблицы:
  - `user_subscriptions`;
  - `plans`;
  - `places`.
- Активная подписка выбирается по:
  - `user_id`;
  - `status = 'active'`.
- Если активных подписок несколько, берётся последняя по:
  - `starts_at DESC`;
  - `id DESC`.
- Использование лимита считается по объявлениям пользователя со статусами:
  - `pending`;
  - `published`;
  - `rejected`.
- Архивные/истёкшие объявления в лимит не входят, если они имеют другой статус.
- Доступные тарифы выбираются из `plans`, где:
  - `is_active = 1`.
- Тарифы сортируются по:
  - `price ASC`;
  - `max_places ASC`;
  - `id ASC`.

## PHP-код

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

try {
    $pdo = getDatabaseConnection();

    $subscriptionStmt = $pdo->prepare("
        SELECT
            us.id,
            us.user_id,
            us.plan_id,
            us.source,
            us.status,
            us.starts_at,
            us.expires_at,
            us.created_at,
            us.updated_at,

            p.code AS plan_code,
            p.title AS plan_title,
            p.description AS plan_description,
            p.max_places,
            p.duration_days,
            p.price,
            p.is_active AS plan_is_active

        FROM user_subscriptions us
        INNER JOIN plans p
            ON p.id = us.plan_id
        WHERE us.user_id = :user_id
        AND us.status = 'active'
        ORDER BY us.starts_at DESC, us.id DESC
        LIMIT 1
    ");

    $subscriptionStmt->execute([
        'user_id' => $userId,
    ]);

    $subscription = $subscriptionStmt->fetch();

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

    if (!$subscription) {
        successResponse([
            'subscription' => null,
            'plan' => null,
            'usage' => [
                'used' => $usedPlaces,
                'limit' => 0,
                'remaining' => 0,
            ],
            'available_plans' => $availablePlans,
        ]);
    }

    $limit = (int) ($subscription['max_places'] ?? 0);

    successResponse([
        'subscription' => [
            'id' => (int) $subscription['id'],
            'status' => $subscription['status'],
            'source' => $subscription['source'],
            'starts_at' => $subscription['starts_at'],
            'expires_at' => $subscription['expires_at'],
            'created_at' => $subscription['created_at'],
            'updated_at' => $subscription['updated_at'],
        ],
        'plan' => [
            'id' => (int) $subscription['plan_id'],
            'code' => $subscription['plan_code'],
            'title' => $subscription['plan_title'],
            'description' => $subscription['plan_description'],
            'max_places' => $limit,
            'duration_days' => (int) ($subscription['duration_days'] ?? 0),
            'price' => (float) ($subscription['price'] ?? 0),
            'is_active' => (int) ($subscription['plan_is_active'] ?? 0),
        ],
        'usage' => [
            'used' => $usedPlaces,
            'limit' => $limit,
            'remaining' => $limit > 0 ? max(0, $limit - $usedPlaces) : 0,
        ],
        'available_plans' => $availablePlans,
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить текущий тариф', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Документ структурирован из `php-after-changes/api-my-subscription-updated.md`. |