<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';
require_once __DIR__ . '/../shared/moderator-log.php';

$adminUser = requireAdmin();

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    $input = [];
}

$id = (int) ($input['id'] ?? 0);
$code = trim((string) ($input['code'] ?? ''));
$title = trim((string) ($input['title'] ?? ''));
$description = trim((string) ($input['description'] ?? ''));

$maxPlaces = (int) ($input['max_places'] ?? 0);
$durationDays = (int) ($input['duration_days'] ?? 14);

$priceRaw = $input['price'] ?? 0;
$price = is_numeric($priceRaw) ? (float) $priceRaw : -1;

$isActiveRaw = $input['is_active'] ?? 0;
$isActive = in_array($isActiveRaw, [1, '1', true, 'true', 'on', 'yes'], true) ? 1 : 0;

$code = mb_strtolower($code, 'UTF-8');

if ($id <= 0) {
    errorResponse('Не передан ID тарифа', 400);
}

if ($code === '') {
    errorResponse('Введите код тарифа', 422);
}

if (!preg_match('/^[a-z0-9_-]+$/', $code)) {
    errorResponse('Код тарифа может содержать только латинские буквы, цифры, дефис и подчёркивание', 422);
}

if (mb_strlen($code, 'UTF-8') > 100) {
    errorResponse('Код тарифа не должен быть длиннее 100 символов', 422);
}

if ($title === '') {
    errorResponse('Введите название тарифа', 422);
}

if (mb_strlen($title, 'UTF-8') > 255) {
    errorResponse('Название тарифа не должно быть длиннее 255 символов', 422);
}

if ($maxPlaces < 0) {
    errorResponse('Лимит объявлений не может быть отрицательным', 422);
}

if ($durationDays <= 0) {
    errorResponse('Срок тарифа должен быть больше 0 дней', 422);
}

if ($price < 0) {
    errorResponse('Цена тарифа не может быть отрицательной', 422);
}

$price = round($price, 2);

try {
    $pdo = getDatabaseConnection();

    $pdo->beginTransaction();

    $planStmt = $pdo->prepare("
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
        WHERE id = :id
        LIMIT 1
    ");

    $planStmt->execute([
        'id' => $id,
    ]);

    $plan = $planStmt->fetch();

    if (!$plan) {
        $pdo->rollBack();
        errorResponse('Тариф не найден', 404);
    }

    $existsStmt = $pdo->prepare("
        SELECT id
        FROM plans
        WHERE code = :code
        AND id <> :id
        LIMIT 1
    ");

    $existsStmt->execute([
        'id' => $id,
        'code' => $code,
    ]);

    if ($existsStmt->fetch()) {
        $pdo->rollBack();
        errorResponse('Тариф с таким кодом уже существует', 422);
    }

    $stmt = $pdo->prepare("
        UPDATE plans
        SET
            code = :code,
            title = :title,
            description = :description,
            max_places = :max_places,
            duration_days = :duration_days,
            price = :price,
            is_active = :is_active,
            updated_at = NOW()
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $id,
        'code' => $code,
        'title' => $title,
        'description' => $description !== '' ? $description : null,
        'max_places' => $maxPlaces,
        'duration_days' => $durationDays,
        'price' => number_format($price, 2, '.', ''),
        'is_active' => $isActive,
    ]);

    writeModeratorLog(
        (int) $adminUser['id'],
        'update_plan',
        'plan',
        $id,
        'Обновлён тариф: ' . $title . ' (' . $code . ')',
        $pdo
    );

    $pdo->commit();

    successResponse([
        'message' => 'Тариф обновлён',
        'plan_id' => $id,
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    if ($e instanceof PDOException && ($e->errorInfo[1] ?? null) === 1062) {
        errorResponse('Тариф с таким кодом уже существует', 422);
    }

    errorResponse('Не удалось обновить тариф', 500, [
        'error' => $e->getMessage(),
    ]);
}
