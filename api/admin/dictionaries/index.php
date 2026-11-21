<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdminOrModerator();

try {
    $pdo = getDatabaseConnection();

    $groupsStmt = $pdo->query("
        SELECT
            rg.id,
            rg.code,
            rg.title,
            rg.description,
            rg.sort_order,
            rg.is_active,
            rg.created_at,
            rg.updated_at,
            COALESCE(rv_counts.values_count, 0) AS values_count,
            COALESCE(ad_counts.attributes_count, 0) AS attributes_count
        FROM reference_groups rg
        LEFT JOIN (
            SELECT
                group_id,
                COUNT(*) AS values_count
            FROM reference_values
            GROUP BY group_id
        ) rv_counts
            ON rv_counts.group_id = rg.id
        LEFT JOIN (
            SELECT
                reference_group_id,
                COUNT(*) AS attributes_count
            FROM attribute_definitions
            WHERE reference_group_id IS NOT NULL
            GROUP BY reference_group_id
        ) ad_counts
            ON ad_counts.reference_group_id = rg.id
        ORDER BY
            rg.sort_order ASC,
            rg.id ASC
    ");

    $valuesStmt = $pdo->query("
        SELECT
            rv.id,
            rv.group_id,
            rv.code,
            rv.title,
            rv.sort_order,
            rv.is_active,
            rv.created_at,
            rv.updated_at,
            rg.code AS group_code,
            rg.title AS group_title
        FROM reference_values rv
        INNER JOIN reference_groups rg
            ON rg.id = rv.group_id
        ORDER BY
            rg.sort_order ASC,
            rg.id ASC,
            rv.sort_order ASC,
            rv.id ASC
    ");

    successResponse([
        'groups' => $groupsStmt->fetchAll(),
        'values' => $valuesStmt->fetchAll(),
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить справочники', 500, [
        'error' => $e->getMessage(),
    ]);
}
