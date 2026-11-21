<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();
$paymentId = (int) ($_GET['payment_id'] ?? 0);

if ($paymentId <= 0) {
    errorResponse('Не указан платеж', 422);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            id,
            amount,
            currency,
            status,
            paid_at,
            created_at,
            updated_at
        FROM payments
        WHERE id = :id
        AND user_id = :user_id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $paymentId,
        'user_id' => $userId,
    ]);

    $payment = $stmt->fetch();

    if (!$payment) {
        errorResponse('Платёж не найден', 404);
    }

    successResponse([
        'payment_id' => (int) $payment['id'],
        'payment_required' => $payment['status'] !== 'paid',
        'status' => $payment['status'],
        'amount' => (float) $payment['amount'],
        'currency' => $payment['currency'],
        'paid_at' => $payment['paid_at'],
        'created_at' => $payment['created_at'],
        'updated_at' => $payment['updated_at'],
        'confirmation_url' => null,
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось проверить платёж', 500, [
        'error' => $e->getMessage(),
    ]);
}
