<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdmin();

$paymentId = (int) ($_GET['id'] ?? 0);

if ($paymentId <= 0) {
    errorResponse('Не передан ID платежа', 422);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
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
            u.phone AS user_phone,
            u.telegram AS user_telegram,

            us.plan_id,
            us.status AS subscription_status,
            us.source AS subscription_source,
            us.starts_at,
            us.expires_at,

            pl.title AS plan_title,
            pl.code AS plan_code,
            pl.duration_days,
            pl.max_places
        FROM payments p
        LEFT JOIN users u
            ON u.id = p.user_id
        LEFT JOIN user_subscriptions us
            ON us.id = p.subscription_id
        LEFT JOIN plans pl
            ON pl.id = us.plan_id
        WHERE p.id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $paymentId,
    ]);

    $payment = $stmt->fetch();

    if (!$payment) {
        errorResponse('Платёж не найден', 404);
    }

    successResponse([
        'payment' => $payment,
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить платёж', 500, [
        'error' => $e->getMessage(),
    ]);
}
