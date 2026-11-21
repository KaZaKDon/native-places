<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

$categoryId = (int) ($_GET['category_id'] ?? 0);

if ($categoryId <= 0) {
    errorResponse('Не передан ID категории', 400);
}

try {

    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
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

            rg.code AS reference_group_code,
            rg.title AS reference_group_title

        FROM attribute_definitions ad

        LEFT JOIN reference_groups rg
            ON rg.id = ad.reference_group_id

        WHERE ad.category_id = :category_id
        AND ad.is_active = 1

        ORDER BY ad.sort_order ASC, ad.id ASC
    ");

    $stmt->execute([
        'category_id' => $categoryId,
    ]);

    $attributes = $stmt->fetchAll();

    successResponse([
        'category_id' => $categoryId,
        'attributes' => $attributes,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось получить характеристики категории',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );

}
