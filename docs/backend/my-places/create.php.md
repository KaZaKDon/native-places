# api/my-places/create.php

## Статус

| Поле | Значение |
|---|---|
| Backend на хосте | да |
| Код сверено с хостом | да |
| Источник | `php-after-changes/api-my-places-updated.md` |
| Подключено на фронте | уточнить |
| Нужны правки backend | нет |
| Нужны правки frontend | уточнить |

## Назначение

Endpoint создаёт новый объект/объявление текущего авторизованного пользователя.

На этом этапе создаётся первичная запись в таблице `places` со статусом:

```text
pending
```

То есть после создания объект отправляется на модерацию.

Endpoint также учитывает выбранный тариф:

- проверяет активность тарифа;
- проверяет лимит объявлений по тарифу;
- для бесплатного/промо-тарифа создаёт активную подписку;
- для платного тарифа создаёт pending-платёж;
- возвращает frontend-у информацию, требуется ли оплата.

## Метод и URL

```http
POST /api/my-places/create.php
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
  "title": "Название объекта",
  "category_id": 1,
  "place_type_id": 2,
  "locality_id": 3,
  "plan_id": 4
}
```

## Request fields

| Поле | Тип | Обязательное | Правила |
|---|---|---:|---|
| `title` | string | да | Не пустое, максимум 255 символов. |
| `category_id` | number | да | ID активной категории. |
| `place_type_id` | number | да | ID активного типа объекта, который относится к выбранной категории. |
| `locality_id` | number | да | ID активного населённого пункта. |
| `plan_id` | number | да | ID активного тарифа. |

## Success response

HTTP `201`

### Вариант 1 — оплата не требуется

```json
{
  "success": true,
  "data": {
    "message": "Объект успешно создан",
    "place_id": 123,
    "slug": "place_ab12cd34ef56gh78",
    "status": "pending",
    "publication_type": "free",
    "payment_status": "not_required",
    "payment_required": false,
    "payment_id": null,
    "subscription_id": 10,
    "plan": {
      "id": 1,
      "code": "private_free",
      "title": "Бесплатный",
      "max_places": 1,
      "duration_days": 0,
      "price": 0
    },
    "locality_id": 3
  }
}
```

### Вариант 2 — требуется оплата

```json
{
  "success": true,
  "data": {
    "message": "Объект создан. Требуется оплата тарифа.",
    "place_id": 123,
    "slug": "place_ab12cd34ef56gh78",
    "status": "pending",
    "publication_type": "paid",
    "payment_status": "unpaid",
    "payment_required": true,
    "payment_id": 55,
    "subscription_id": null,
    "plan": {
      "id": 2,
      "code": "business",
      "title": "Бизнес",
      "max_places": 10,
      "duration_days": 30,
      "price": 990
    },
    "locality_id": 3
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `400` | `Некорректный JSON` | Тело запроса не является JSON-объектом. |
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `422` | `Ошибка валидации` | Не заполнены обязательные поля или название слишком длинное. |
| `422` | `Населённый пункт не найден или отключён` | `locality_id` не найден или неактивен. |
| `422` | `Категория не найдена или отключена` | `category_id` не найден или неактивен. |
| `422` | `Тип объекта не найден или не относится к выбранной категории` | `place_type_id` не найден, неактивен или относится к другой категории. |
| `422` | `Тариф не найден или отключён` | `plan_id` не найден или тариф неактивен. |
| `422` | `Превышен лимит объявлений по тарифу` | Количество активных объявлений пользователя уже достигло лимита тарифа. |
| `500` | `Не удалось создать объект` | Неожиданная ошибка backend-а или базы данных. |

## Validation details

Если не заполнены обязательные поля:

```json
{
  "success": false,
  "message": "Ошибка валидации",
  "extra": {
    "errors": {
      "title": "Введите название объекта",
      "category_id": "Выберите категорию",
      "place_type_id": "Выберите тип объекта",
      "locality_id": "Выберите населённый пункт",
      "plan_id": "Выберите тариф"
    }
  }
}
```

Если превышен лимит тарифа:

```json
{
  "success": false,
  "message": "Превышен лимит объявлений по тарифу",
  "extra": {
    "errors": {
      "plan_id": "Выберите тариф с большим лимитом или переместите старые объявления в архив"
    },
    "limit": 3,
    "used": 3
  }
}
```

## Frontend notes

- Endpoint используется на первом шаге создания объекта.
- До вызова endpoint-а frontend должен передать:
  - название;
  - категорию;
  - тип;
  - населённый пункт;
  - выбранный тариф.
- После успешного создания объект получает статус `pending`.
- Если `payment_required = false`, можно перейти к следующему шагу заполнения/редактирования объекта или показать успешное создание.
- Если `payment_required = true`, нужно перейти к платежному сценарию.
- В текущем ответе `payment_id` создаётся, но `confirmation_url` не возвращается.
- Для получения ссылки оплаты должен использоваться отдельный платежный endpoint.
- Если backend вернул `422`, ошибки нужно привязать к полям формы.
- Если превышен лимит тарифа, frontend должен показать `limit` и `used`.
- При `401` отправить пользователя на login.

## Backend notes

- Используются таблицы:
  - `localities`;
  - `categories`;
  - `place_types`;
  - `plans`;
  - `places`;
  - `user_subscriptions`;
  - `payments`.
- Проверяется, что населённый пункт активен:
  - `localities.is_active = 1`.
- Проверяется, что категория активна:
  - `categories.is_active = 1`.
- Проверяется, что тип объекта:
  - активен;
  - относится к выбранной категории.
- Проверяется, что тариф активен:
  - `plans.is_active = 1`.
- Лимит считается по объектам пользователя со статусами:
  - `pending`;
  - `published`;
  - `rejected`.
- Slug генерируется автоматически:
  - `place_` + random hex.
- Новая запись в `places` создаётся с координатами:
  - `latitude = 0`;
  - `longitude = 0`.
- Для платного тарифа создаётся запись в `payments` со статусом `pending`.
- Для бесплатного/промо-тарифа:
  - старые активные подписки отменяются;
  - создаётся новая активная подписка.
- Операции выполняются в транзакции.
- При ошибке транзакция откатывается.

## Payment logic

Логика публикации и оплаты:

| Условие | `publication_type` | `payment_status` | `payment_required` |
|---|---|---|---|
| Приватный тариф с ценой `0` | `free` | `not_required` | `false` |
| Любой платный тариф | `paid` | `unpaid` | `true` |
| Бесплатный/промо тариф не private | `paid` | `not_required` | `false` |

Важно: в коде `publication_type` зависит от `plan_code` и цены:

```php
$isPrivatePlan = str_starts_with($planCode, 'private_');
$publicationType = $isPrivatePlan && $planPrice <= 0 ? 'free' : 'paid';
```

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

$title = trim($input['title'] ?? '');
$categoryId = (int) ($input['category_id'] ?? 0);
$placeTypeId = (int) ($input['place_type_id'] ?? 0);
$localityId = (int) ($input['locality_id'] ?? 0);
$planId = (int) ($input['plan_id'] ?? 0);

$errors = [];

if ($title === '') {
    $errors['title'] = 'Введите название объекта';
} elseif (mb_strlen($title) > 255) {
    $errors['title'] = 'Название объекта слишком длинное';
}

if ($categoryId <= 0) {
    $errors['category_id'] = 'Выберите категорию';
}

if ($placeTypeId <= 0) {
    $errors['place_type_id'] = 'Выберите тип объекта';
}

if ($localityId <= 0) {
    $errors['locality_id'] = 'Выберите населённый пункт';
}

if ($planId <= 0) {
    $errors['plan_id'] = 'Выберите тариф';
}

if (!empty($errors)) {
    errorResponse('Ошибка валидации', 422, [
        'errors' => $errors,
    ]);
}

try {
    $pdo = getDatabaseConnection();

    $localityStmt = $pdo->prepare("
        SELECT id
        FROM localities
        WHERE id = :id
        AND is_active = 1
        LIMIT 1
    ");

    $localityStmt->execute([
        'id' => $localityId,
    ]);

    if (!$localityStmt->fetch()) {
        errorResponse('Населённый пункт не найден или отключён', 422, [
            'errors' => [
                'locality_id' => 'Выберите населённый пункт из списка',
            ],
        ]);
    }

    $categoryStmt = $pdo->prepare("
        SELECT id
        FROM categories
        WHERE id = :id
        AND is_active = 1
        LIMIT 1
    ");

    $categoryStmt->execute([
        'id' => $categoryId,
    ]);

    if (!$categoryStmt->fetch()) {
        errorResponse('Категория не найдена или отключена', 422, [
            'errors' => [
                'category_id' => 'Выберите активную категорию',
            ],
        ]);
    }

    $typeStmt = $pdo->prepare("
        SELECT id
        FROM place_types
        WHERE id = :id
        AND category_id = :category_id
        AND is_active = 1
        LIMIT 1
    ");

    $typeStmt->execute([
        'id' => $placeTypeId,
        'category_id' => $categoryId,
    ]);

    if (!$typeStmt->fetch()) {
        errorResponse('Тип объекта не найден или не относится к выбранной категории', 422, [
            'errors' => [
                'place_type_id' => 'Выберите активный тип объекта',
            ],
        ]);
    }

    $planStmt = $pdo->prepare("
        SELECT
            id,
            code,
            title,
            max_places,
            duration_days,
            price
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

    if ($maxPlaces > 0) {
        $activePlacesStmt = $pdo->prepare("
            SELECT COUNT(*)
            FROM places
            WHERE user_id = :user_id
            AND status IN ('pending', 'published', 'rejected')
        ");

        $activePlacesStmt->execute([
            'user_id' => $userId,
        ]);

        $activePlacesCount = (int) $activePlacesStmt->fetchColumn();

        if ($activePlacesCount >= $maxPlaces) {
            errorResponse('Превышен лимит объявлений по тарифу', 422, [
                'errors' => [
                    'plan_id' => 'Выберите тариф с большим лимитом или переместите старые объявления в архив',
                ],
                'limit' => $maxPlaces,
                'used' => $activePlacesCount,
            ]);
        }
    }

    $planCode = (string) ($plan['code'] ?? '');
    $planPrice = (float) ($plan['price'] ?? 0);
    $durationDays = $plan['duration_days'] !== null ? (int) $plan['duration_days'] : 0;

    $isPrivatePlan = str_starts_with($planCode, 'private_');
    $publicationType = $isPrivatePlan && $planPrice <= 0 ? 'free' : 'paid';
    $paymentStatus = $planPrice > 0 ? 'unpaid' : 'not_required';
    $paymentRequired = $planPrice > 0;

    $subscriptionExpiresAt = null;

    if ($durationDays > 0) {
        $subscriptionExpiresAt = (new DateTimeImmutable())
            ->modify('+' . $durationDays . ' days')
            ->format('Y-m-d H:i:s');
    }

    $slug = 'place_' . bin2hex(random_bytes(8));

    $pdo->beginTransaction();

    $subscriptionId = null;

    if (!$paymentRequired) {
        $cancelSubscriptionsStmt = $pdo->prepare("
            UPDATE user_subscriptions
            SET
                status = 'cancelled',
                updated_at = NOW()
            WHERE user_id = :user_id
            AND status = 'active'
        ");

        $cancelSubscriptionsStmt->execute([
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
            'expires_at' => $subscriptionExpiresAt,
        ]);

        $subscriptionId = (int) $pdo->lastInsertId();
    }

    $stmt = $pdo->prepare("
        INSERT INTO places (
            user_id,
            category_id,
            place_type_id,
            locality_id,
            title,
            slug,
            latitude,
            longitude,
            status,
            publication_type,
            payment_status,
            created_at,
            updated_at
        ) VALUES (
            :user_id,
            :category_id,
            :place_type_id,
            :locality_id,
            :title,
            :slug,
            :latitude,
            :longitude,
            'pending',
            :publication_type,
            :payment_status,
            NOW(),
            NOW()
        )
    ");

    $stmt->execute([
        'user_id' => $userId,
        'category_id' => $categoryId,
        'place_type_id' => $placeTypeId,
        'locality_id' => $localityId,
        'title' => $title,
        'slug' => $slug,
        'latitude' => 0,
        'longitude' => 0,
        'publication_type' => $publicationType,
        'payment_status' => $paymentStatus,
    ]);

    $placeId = (int) $pdo->lastInsertId();

    $paymentId = null;

    if ($paymentRequired) {
        $paymentStmt = $pdo->prepare("
            INSERT INTO payments (
                user_id,
                subscription_id,
                amount,
                currency,
                payment_provider,
                status,
                created_at,
                updated_at
            ) VALUES (
                :user_id,
                NULL,
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
            'amount' => $planPrice,
        ]);

        $paymentId = (int) $pdo->lastInsertId();
    }

    $pdo->commit();

    successResponse([
        'message' => $paymentRequired
            ? 'Объект создан. Требуется оплата тарифа.'
            : 'Объект успешно создан',
        'place_id' => $placeId,
        'slug' => $slug,
        'status' => 'pending',
        'publication_type' => $publicationType,
        'payment_status' => $paymentStatus,
        'payment_required' => $paymentRequired,
        'payment_id' => $paymentId,
        'subscription_id' => $subscriptionId,
        'plan' => [
            'id' => (int) $plan['id'],
            'code' => $planCode,
            'title' => $plan['title'],
            'max_places' => $maxPlaces,
            'duration_days' => $durationDays,
            'price' => $planPrice,
        ],
        'locality_id' => $localityId,
    ], 201);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось создать объект', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Документ структурирован из `php-after-changes/api-my-places-updated.md`. |