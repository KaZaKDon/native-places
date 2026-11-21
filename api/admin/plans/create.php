<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdmin();

$input = json_decode(file_get_contents('php://input'), true);

$code = trim($input['code'] ?? '');
$title = trim($input['title'] ?? '');
$description = trim($input['description'] ?? '');
$maxPlaces = (int) ($input['max_places'] ?? 0);
$durationDays = (int) ($input['duration_days'] ?? 14);
$price = (float) ($input['price'] ?? 0);
$isActive = !empty($input['is_active']) ? 1 : 0;

if ($code === '') {
    errorResponse('Введите код тарифа', 422);
}

if ($title === '') {
    errorResponse('Введите название тарифа', 422);
}

try {
    $pdo = getDatabaseConnection();

    $existsStmt = $pdo->prepare("
        SELECT id
        FROM plans
        WHERE code = :code
        LIMIT 1
    ");

    $existsStmt->execute([
        'code' => $code,
    ]);

    if ($existsStmt->fetch()) {
        errorResponse('Тариф с таким кодом уже существует', 422);
    }

    $stmt = $pdo->prepare("
        INSERT INTO plans (
            code,
            title,
            description,
            max_places,
            duration_days,
            price,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            :code,
            :title,
            :description,
            :max_places,
            :duration_days,
            :price,
            :is_active,
            NOW(),
            NOW()
        )
    ");

    $stmt->execute([
        'code' => $code,
        'title' => $title,
        'description' => $description !== '' ? $description : null,
        'max_places' => $maxPlaces,
        'duration_days' => $durationDays,
        'price' => $price,
        'is_active' => $isActive,
    ]);

    successResponse([
        'message' => 'Тариф создан',
        'plan_id' => (int) $pdo->lastInsertId(),
    ], 201);
} catch (Throwable $e) {
    errorResponse('Не удалось создать тариф', 500, [
        'error' => $e->getMessage(),
    ]);
}
