<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdmin();

$input = json_decode(
    file_get_contents('php://input'),
    true
);

$settings = $input['settings'] ?? null;

if (!is_array($settings)) {
    errorResponse('Передайте массив настроек', 400);
}

try {
    $pdo = getDatabaseConnection();

    $availableStmt = $pdo->query("
        SELECT
            setting_key,
            field_type
        FROM site_settings
    ");

    $availableSettings = [];

    foreach ($availableStmt->fetchAll() as $setting) {
        $availableSettings[$setting['setting_key']] = $setting['field_type'];
    }

    $updateStmt = $pdo->prepare("
        UPDATE site_settings
        SET
            setting_value = :setting_value,
            updated_at = NOW()
        WHERE setting_key = :setting_key
        LIMIT 1
    ");

    $updatedKeys = [];

    foreach ($settings as $key => $value) {
        if (!isset($availableSettings[$key])) {
            continue;
        }

        $fieldType = $availableSettings[$key];

        if ($fieldType === 'boolean') {
            $normalizedValue = $value ? '1' : '0';
        } else {
            $normalizedValue = trim((string) $value);
        }

        $updateStmt->execute([
            'setting_key' => $key,
            'setting_value' => $normalizedValue,
        ]);

        $updatedKeys[] = $key;
    }

    successResponse([
        'message' => 'Настройки успешно обновлены',
        'updated_keys' => $updatedKeys,
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось обновить настройки сайта', 500, [
        'error' => $e->getMessage(),
    ]);
}
