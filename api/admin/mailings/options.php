<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdmin();

try {
    $pdo = getDatabaseConnection();

    $categoriesStmt = $pdo->query("
        SELECT
            code,
            title
        FROM categories
        WHERE is_active = 1
        ORDER BY sort_order ASC, id ASC
    ");

    $plansStmt = $pdo->query("
        SELECT
            code,
            title
        FROM plans
        WHERE is_active = 1
        ORDER BY id ASC
    ");

    $rolesStmt = $pdo->query("
        SELECT
            code,
            title
        FROM roles
        ORDER BY id ASC
    ");

    successResponse([
        'audience_types' => [
            [
                'value' => 'all',
                'title' => 'Все пользователи',
                'requires_value' => false,
            ],
            [
                'value' => 'moderators',
                'title' => 'Модераторы',
                'requires_value' => false,
            ],
            [
                'value' => 'category',
                'title' => 'По категории объявлений',
                'requires_value' => true,
            ],
            [
                'value' => 'plan',
                'title' => 'По тарифу',
                'requires_value' => true,
            ],
            [
                'value' => 'role',
                'title' => 'По роли',
                'requires_value' => true,
            ],
        ],
        'categories' => $categoriesStmt->fetchAll(),
        'plans' => $plansStmt->fetchAll(),
        'roles' => $rolesStmt->fetchAll(),
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить данные для рассылок', 500, [
        'error' => $e->getMessage(),
    ]);
}
