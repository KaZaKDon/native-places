<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdmin();

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->query("
        SELECT
            id,
            setting_key,
            setting_value,
            setting_group,
            field_type,
            title,
            sort_order,
            updated_at
        FROM site_settings
        ORDER BY setting_group ASC, sort_order ASC, id ASC
    ");

    $settings = $stmt->fetchAll();

    $groups = [];

    foreach ($settings as $setting) {
        $groupCode = $setting['setting_group'];

        if (!isset($groups[$groupCode])) {
            $groups[$groupCode] = [
                'code' => $groupCode,
                'title' => getSettingsGroupTitle($groupCode),
                'items' => [],
            ];
        }

        $groups[$groupCode]['items'][] = [
            'id' => (int) $setting['id'],
            'key' => $setting['setting_key'],
            'value' => $setting['setting_value'],
            'group' => $setting['setting_group'],
            'field_type' => $setting['field_type'],
            'title' => $setting['title'],
            'sort_order' => (int) $setting['sort_order'],
            'updated_at' => $setting['updated_at'],
        ];
    }

    successResponse([
        'groups' => array_values($groups),
        'settings' => $settings,
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить настройки сайта', 500, [
        'error' => $e->getMessage(),
    ]);
}

function getSettingsGroupTitle(string $groupCode): string
{
    $titles = [
        'general' => 'Общие настройки',
        'places' => 'Объявления',
        'moderation' => 'Модерация',
        'payments' => 'Платежи',
        'contacts' => 'Контакты',
    ];

    return $titles[$groupCode] ?? $groupCode;
}
