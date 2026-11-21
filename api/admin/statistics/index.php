<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdminOrModerator();

try {
    $pdo = getDatabaseConnection();

    $usersTotal = (int) $pdo->query("SELECT COUNT(*) AS total FROM users")->fetch()['total'];
    $usersActive = (int) $pdo->query("SELECT COUNT(*) AS total FROM users WHERE status = 'active'")->fetch()['total'];

    $placesTotal = (int) $pdo->query("SELECT COUNT(*) AS total FROM places")->fetch()['total'];
    $placesPublished = (int) $pdo->query("SELECT COUNT(*) AS total FROM places WHERE status = 'published'")->fetch()['total'];
    $placesPending = (int) $pdo->query("SELECT COUNT(*) AS total FROM places WHERE status = 'pending'")->fetch()['total'];

    $reportsTotal = (int) $pdo->query("SELECT COUNT(*) AS total FROM reports")->fetch()['total'];
    $reportsNew = (int) $pdo->query("SELECT COUNT(*) AS total FROM reports WHERE status = 'new'")->fetch()['total'];

    $reviewsTotal = (int) $pdo->query("SELECT COUNT(*) AS total FROM reviews")->fetch()['total'];
    $reviewsPending = (int) $pdo->query("SELECT COUNT(*) AS total FROM reviews WHERE status = 'pending'")->fetch()['total'];
    
    $appealsTotal = (int) $pdo->query("SELECT COUNT(*) AS total FROM appeals")->fetch()['total'];
    $appealsNew = (int) $pdo->query("SELECT COUNT(*) AS total FROM appeals WHERE status = 'new'")->fetch()['total'];

    $paymentsTotal = (int) $pdo->query("SELECT COUNT(*) AS total FROM payments")->fetch()['total'];
    $paymentsPaid = (int) $pdo->query("SELECT COUNT(*) AS total FROM payments WHERE status = 'paid'")->fetch()['total'];

    $subscriptionsActive = (int) $pdo->query("
        SELECT COUNT(*) AS total
        FROM user_subscriptions
        WHERE status = 'active'
    ")->fetch()['total'];

    $subscriptionsForever = (int) $pdo->query("
        SELECT COUNT(*) AS total
        FROM user_subscriptions
        WHERE status = 'active'
        AND expires_at IS NULL
    ")->fetch()['total'];

    $categoryStmt = $pdo->query("
        SELECT
            c.id,
            c.title,
            COUNT(p.id) AS count
        FROM categories c
        LEFT JOIN places p
            ON p.category_id = c.id
        GROUP BY c.id
        ORDER BY c.sort_order ASC, c.id ASC
    ");

    $tariffStmt = $pdo->query("
        SELECT
            pl.id,
            pl.title,
            COUNT(us.id) AS count
        FROM plans pl
        LEFT JOIN user_subscriptions us
            ON us.plan_id = pl.id
            AND us.status = 'active'
        GROUP BY pl.id
        ORDER BY pl.price ASC, pl.id ASC
    ");

    $paymentStats = [
        [
            'id' => 1,
            'period' => 'Сегодня',
            'amount' => formatPaymentAmount($pdo, "DATE(created_at) = CURDATE()"),
        ],
        [
            'id' => 2,
            'period' => '7 дней',
            'amount' => formatPaymentAmount($pdo, "created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)"),
        ],
        [
            'id' => 3,
            'period' => '30 дней',
            'amount' => formatPaymentAmount($pdo, "created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)"),
        ],
    ];

    $eventsStmt = $pdo->query("
        SELECT
            id,
            created_at AS time,
            description AS title,
            entity_type AS section
        FROM moderator_logs
        ORDER BY created_at DESC, id DESC
        LIMIT 10
    ");

    successResponse([
        'summary' => [
            [
                'id' => 'users',
                'title' => 'Пользователи',
                'value' => $usersTotal,
                'caption' => 'Активных: ' . $usersActive,
            ],
            [
                'id' => 'places',
                'title' => 'Объявления',
                'value' => $placesTotal,
                'caption' => 'Опубликовано: ' . $placesPublished,
            ],
            [
                'id' => 'pending_places',
                'title' => 'На модерации',
                'value' => $placesPending,
                'caption' => 'Ожидают проверки',
            ],
            [
                'id' => 'subscriptions',
                'title' => 'Подписки',
                'value' => $subscriptionsActive,
                'caption' => 'Бессрочных: ' . $subscriptionsForever,
            ],
            [
                'id' => 'reports',
                'title' => 'Жалобы',
                'value' => $reportsTotal,
                'caption' => 'Новых: ' . $reportsNew,
            ],
            [
                'id' => 'payments',
                'title' => 'Платежи',
                'value' => $paymentsTotal,
                'caption' => 'Оплачено: ' . $paymentsPaid,
            ],
        ],
        'categories' => $categoryStmt->fetchAll(),
        'tariffs' => $tariffStmt->fetchAll(),
        'payments' => $paymentStats,
        'events' => $eventsStmt->fetchAll(),
        'extra' => [
            'reviews_total' => $reviewsTotal,
            'reviews_pending' => $reviewsPending,
            'appeals_total' => $appealsTotal,
            'appeals_new' => $appealsNew,
        ],
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить статистику', 500, [
        'error' => $e->getMessage(),
    ]);
}

function formatPaymentAmount(PDO $pdo, string $where): string
{
    $stmt = $pdo->query("
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM payments
        WHERE status = 'paid'
        AND {$where}
    ");

    $total = (float) $stmt->fetch()['total'];

    return number_format($total, 0, '.', ' ') . ' ₽';
}
