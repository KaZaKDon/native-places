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
