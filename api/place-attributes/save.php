<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(
    file_get_contents('php://input'),
    true
);

$placeId = (int) ($input['place_id'] ?? 0);
$attributes = $input['attributes'] ?? [];

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

if (!is_array($attributes)) {
    errorResponse('Некорректный формат характеристик', 422);
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

    $pdo->beginTransaction();

    foreach ($attributes as $attribute) {
        $definitionId = (int) ($attribute['attribute_definition_id'] ?? 0);
        $value = trim((string) ($attribute['value'] ?? ''));

        if ($definitionId <= 0) {
            continue;
        }

        $definitionStmt = $pdo->prepare("
            SELECT id
            FROM attribute_definitions
            WHERE id = :id
            AND category_id = :category_id
            AND is_active = 1
            LIMIT 1
        ");

        $definitionStmt->execute([
            'id' => $definitionId,
            'category_id' => $place['category_id'],
        ]);

        $definition = $definitionStmt->fetch();

        if (!$definition) {
            continue;
        }

        $deleteStmt = $pdo->prepare("
            DELETE FROM place_attributes
            WHERE place_id = :place_id
            AND attribute_definition_id = :attribute_definition_id
        ");

        $deleteStmt->execute([
            'place_id' => $placeId,
            'attribute_definition_id' => $definitionId,
        ]);

        if ($value === '') {
            continue;
        }

        $insertStmt = $pdo->prepare("
            INSERT INTO place_attributes (
                place_id,
                attribute_definition_id,
                value,
                created_at,
                updated_at
            ) VALUES (
                :place_id,
                :attribute_definition_id,
                :value,
                NOW(),
                NOW()
            )
        ");

        $insertStmt->execute([
            'place_id' => $placeId,
            'attribute_definition_id' => $definitionId,
            'value' => $value,
        ]);
    }

    $pdo->commit();

    successResponse([
        'message' => 'Характеристики объекта сохранены',
        'place_id' => $placeId,
    ]);

} catch (Throwable $e) {

    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse(
        'Не удалось сохранить характеристики объекта',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );
}
