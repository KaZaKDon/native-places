<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    errorResponse('Некорректный JSON', 400);
}

$event = (string) ($input['event'] ?? '');
$object = $input['object'] ?? [];
$providerPaymentId = (string) ($object['id'] ?? '');
$providerStatus = (string) ($object['status'] ?? '');
$metadataPaymentId = (int) ($object['metadata']['payment_id'] ?? 0);

if ($providerPaymentId === '' && $metadataPaymentId <= 0) {
    errorResponse('Не указан платеж Ю-Кассы', 422);
}

$status = 'pending';

if ($event === 'payment.succeeded' || $providerStatus === 'succeeded') {
    $status = 'paid';
} elseif ($event === 'payment.canceled' || $providerStatus === 'canceled') {
    $status = 'failed';
}

try {
    $pdo = getDatabaseConnection();
    $pdo->beginTransaction();

    $where = $metadataPaymentId > 0
        ? 'id = :payment_id'
        : 'provider_payment_id = :provider_payment_id';

    $stmt = $pdo->prepare("
        SELECT id, status
        FROM payments
        WHERE {$where}
        LIMIT 1
        FOR UPDATE
    ");

    if ($metadataPaymentId > 0) {
        $stmt->execute(['payment_id' => $metadataPaymentId]);
    } else {
        $stmt->execute(['provider_payment_id' => $providerPaymentId]);
    }

    $payment = $stmt->fetch();

    if (!$payment) {
        $pdo->rollBack();
        errorResponse('Платёж не найден', 404);
    }

    $updateStmt = $pdo->prepare("
        UPDATE payments
        SET
            provider_payment_id = COALESCE(NULLIF(:provider_payment_id, ''), provider_payment_id),
            status = :status,
            paid_at = CASE WHEN :status = 'paid' THEN NOW() ELSE paid_at END,
            updated_at = NOW()
        WHERE id = :id
    ");

    $updateStmt->execute([
        'provider_payment_id' => $providerPaymentId,
        'status' => $status,
        'id' => (int) $payment['id'],
    ]);

    $pdo->commit();

    successResponse([
        'received' => true,
        'payment_id' => (int) $payment['id'],
        'status' => $status,
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось обработать webhook оплаты', 500, [
        'error' => $e->getMessage(),
    ]);
}
