<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdminOrModerator();

$userId = (int) ($_GET['id'] ?? 0);

if ($userId <= 0) {
    errorResponse('Не передан ID пользователя', 422);
}

try {
    $pdo = getDatabaseConnection();

    $userStmt = $pdo->prepare("
        SELECT
            u.id,
            u.role_id,
            u.email,
            u.first_name,
            u.last_name,
            u.profile_status,
            u.phone,
            u.telegram,
            u.avatar,
            u.status,
            u.created_at,
            u.updated_at,
            r.code AS role_code,
            r.title AS role_title
        FROM users u
        INNER JOIN roles r
            ON r.id = u.role_id
        WHERE u.id = :id
        LIMIT 1
    ");

    $userStmt->execute([
        'id' => $userId,
    ]);

    $user = $userStmt->fetch();

    if (!$user) {
        errorResponse('Пользователь не найден', 404);
    }

    $placesStmt = $pdo->prepare("
        SELECT
            p.id,
            p.title,
            p.slug,
            p.status,
            p.publication_type,
            p.payment_status,
            p.created_at,
            p.updated_at,
            c.code AS category_code,
            c.title AS category_title,
            pt.code AS type_code,
            pt.title AS type_title
        FROM places p
        LEFT JOIN categories c
            ON c.id = p.category_id
        LEFT JOIN place_types pt
            ON pt.id = p.place_type_id
        WHERE p.user_id = :user_id
        ORDER BY p.created_at DESC, p.id DESC
    ");

    $placesStmt->execute([
        'user_id' => $userId,
    ]);

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
            pl.code AS plan_code,
            pl.title AS plan_title,
            pl.price AS plan_price,
            pl.duration_days,
            pl.max_places
        FROM user_subscriptions us
        LEFT JOIN plans pl
            ON pl.id = us.plan_id
        WHERE us.user_id = :user_id
        ORDER BY
            CASE WHEN us.status = 'active' THEN 0 ELSE 1 END,
            us.id DESC
        LIMIT 1
    ");

    $subscriptionStmt->execute([
        'user_id' => $userId,
    ]);

    $subscriptionsStmt = $pdo->prepare("
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
            pl.code AS plan_code,
            pl.title AS plan_title,
            pl.price AS plan_price,
            pl.duration_days,
            pl.max_places
        FROM user_subscriptions us
        LEFT JOIN plans pl
            ON pl.id = us.plan_id
        WHERE us.user_id = :user_id
        ORDER BY us.created_at DESC, us.id DESC
    ");

    $subscriptionsStmt->execute([
        'user_id' => $userId,
    ]);

    successResponse([
        'user' => $user,
        'places' => $placesStmt->fetchAll(),
        'subscription' => $subscriptionStmt->fetch() ?: null,
        'subscriptions' => $subscriptionsStmt->fetchAll(),
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить пользователя', 500, [
        'error' => $e->getMessage(),
    ]);
}
