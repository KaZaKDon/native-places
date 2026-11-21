<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$placeId = (int) ($_GET['place_id'] ?? 0);

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

try {

    $pdo = getDatabaseConnection();

    $placeStmt = $pdo->prepare("
        SELECT
            id,
            category_id
        FROM places
        WHERE id = :id
        AND user_id = :user_id
        LIMIT 1
    ");

    $placeStmt->execute([
        'id' => $placeId,
        'user_id' => $userId,
    ]);

    $place = $placeStmt->fetch();

    if (!$place) {
        errorResponse('Объект не найден или нет доступа', 404);
    }

    $stmt = $pdo->prepare("
        SELECT
            pa.id,
            pa.attribute_definition_id,
            pa.value,

            ad.code,
            ad.title,
            ad.field_type,
            ad.is_required,
            ad.is_filterable

        FROM place_attributes pa

        INNER JOIN attribute_definitions ad
            ON ad.id = pa.attribute_definition_id

        WHERE pa.place_id = :place_id

        ORDER BY ad.sort_order ASC, ad.id ASC
    ");

    $stmt->execute([
        'place_id' => $placeId,
    ]);

    $attributes = $stmt->fetchAll();

    successResponse([
        'place_id' => $placeId,
        'attributes' => $attributes,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось получить характеристики объекта',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );

}
