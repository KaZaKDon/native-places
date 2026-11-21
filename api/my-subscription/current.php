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
