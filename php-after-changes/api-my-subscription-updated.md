# PHP после изменений: текущий тариф и смена тарифа пользователя

Новая папка на хосте:

```text
api/my-subscription/
```

Нужны два файла:

```text
api/my-subscription/current.php
api/my-subscription/change.php
```

Логика: тариф считается подпиской пользователя. В норме у одного пользователя должна быть только одна активная запись `user_subscriptions.status = 'active'`.

---

## `api/my-subscription/current.php`

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

---

## `api/my-subscription/change.php`

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