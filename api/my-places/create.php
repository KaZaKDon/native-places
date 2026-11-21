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
