<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdminOrModerator();

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->query("
        SELECT
            ad.id,
            ad.category_id,
            ad.code,
            ad.title,
            ad.field_type,
            ad.reference_group_id,
            ad.is_required,
            ad.is_filterable,
            ad.sort_order,
            ad.is_active,
            ad.created_at,
            ad.updated_at,

            c.code AS category_code,
            c.title AS category_title,

            rg.code AS reference_group_code,
            rg.title AS reference_group_title
        FROM attribute_definitions ad
        INNER JOIN categories c
            ON c.id = ad.category_id
        LEFT JOIN reference_groups rg
            ON rg.id = ad.reference_group_id
        ORDER BY c.sort_order ASC, ad.sort_order ASC, ad.id ASC
    ");

    $categoriesStmt = $pdo->query("
        SELECT
            id,
            code,
            title
        FROM categories
        WHERE is_active = 1
        ORDER BY sort_order ASC, id ASC
    ");

    $referenceGroupsStmt = $pdo->query("
        SELECT
            id,
            code,
            title
        FROM reference_groups
        WHERE is_active = 1
        ORDER BY sort_order ASC, id ASC
    ");

    successResponse([
        'attributes' => $stmt->fetchAll(),
        'categories' => $categoriesStmt->fetchAll(),
        'reference_groups' => $referenceGroupsStmt->fetchAll(),
        'field_types' => [
            ['value' => 'text', 'title' => 'Текст'],
            ['value' => 'textarea', 'title' => 'Большой текст'],
            ['value' => 'number', 'title' => 'Число'],
            ['value' => 'boolean', 'title' => 'Да / Нет'],
            ['value' => 'select', 'title' => 'Выбор одного'],
        ],
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить характеристики', 500, [
        'error' => $e->getMessage(),
    ]);
}
