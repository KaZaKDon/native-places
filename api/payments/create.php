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

$paymentId = (int) ($input['payment_id'] ?? 0);
$returnUrl = trim((string) ($input['return_url'] ?? getenv('YOOKASSA_RETURN_URL') ?: ''));

if ($paymentId <= 0) {
    errorResponse('Не указан платеж', 422, [
        'errors' => [
            'payment_id' => 'Не указан платеж',
        ],
    ]);
}

$shopId = getenv('YOOKASSA_SHOP_ID') ?: '';
$secretKey = getenv('YOOKASSA_SECRET_KEY') ?: '';

if ($shopId === '' || $secretKey === '') {
    errorResponse('Ю-Касса ещё не настроена', 503);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            id,
            user_id,
            amount,
            currency,
            payment_provider,
            provider_payment_id,
            status
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

    if ($payment['status'] === 'paid') {
        successResponse([
            'message' => 'Платёж уже оплачен',
            'payment_required' => false,
            'payment_id' => (int) $payment['id'],
            'status' => 'paid',
            'confirmation_url' => null,
        ]);
    }

    $amount = number_format((float) $payment['amount'], 2, '.', '');
    $currency = $payment['currency'] ?: 'RUB';
    $idempotenceKey = 'nativeplaces-payment-' . $paymentId;

    $payload = [
        'amount' => [
            'value' => $amount,
            'currency' => $currency,
        ],
        'capture' => true,
        'confirmation' => [
            'type' => 'redirect',
            'return_url' => $returnUrl !== '' ? $returnUrl : 'https://nativeplaces.ru/account',
        ],
        'description' => 'Оплата тарифа Native Places #' . $paymentId,
        'metadata' => [
            'payment_id' => (string) $paymentId,
            'user_id' => (string) $userId,
        ],
    ];

    $ch = curl_init('https://api.yookassa.ru/v3/payments');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPAUTH => CURLAUTH_BASIC,
        CURLOPT_USERPWD => $shopId . ':' . $secretKey,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Idempotence-Key: ' . $idempotenceKey,
        ],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
        CURLOPT_TIMEOUT => 30,
    ]);

    $raw = curl_exec($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($raw === false || $curlError !== '') {
        errorResponse('Не удалось создать платёж в Ю-Кассе', 502, [
            'error' => $curlError,
        ]);
    }

    $providerResponse = json_decode($raw, true);

    if (!is_array($providerResponse)) {
        errorResponse('Ю-Касса вернула некорректный ответ', 502, [
            'response' => $raw,
        ]);
    }

    if ($httpCode < 200 || $httpCode >= 300) {
        errorResponse('Ю-Касса не приняла платёж', 502, [
            'response' => $providerResponse,
        ]);
    }

    $providerPaymentId = (string) ($providerResponse['id'] ?? '');
    $confirmationUrl = (string) ($providerResponse['confirmation']['confirmation_url'] ?? '');

    if ($providerPaymentId === '' || $confirmationUrl === '') {
        errorResponse('Ю-Касса не вернула ссылку оплаты', 502, [
            'response' => $providerResponse,
        ]);
    }

    $updateStmt = $pdo->prepare("
        UPDATE payments
        SET
            payment_provider = 'yookassa',
            provider_payment_id = :provider_payment_id,
            status = 'pending',
            updated_at = NOW()
        WHERE id = :id
    ");

    $updateStmt->execute([
        'provider_payment_id' => $providerPaymentId,
        'id' => $paymentId,
    ]);

    successResponse([
        'message' => 'Перенаправляем на оплату',
        'payment_required' => true,
        'payment_id' => $paymentId,
        'status' => 'pending',
        'confirmation_url' => $confirmationUrl,
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось создать платёж', 500, [
        'error' => $e->getMessage(),
    ]);
}
