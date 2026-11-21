<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';
require_once __DIR__ . '/../shared/moderator-log.php';

$adminUser = requireAdmin();

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    $input = [];
}

$attributeId = (int) ($input['id'] ?? 0);

if ($attributeId <= 0) {
    errorResponse('Не передан ID характеристики', 422);
}

try {
    $pdo = getDatabaseConnection();

    $pdo->beginTransaction();

    $stmt = $pdo->prepare("
        SELECT
            id,
            title,
            code
        FROM attribute_definitions
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $attributeId,
    ]);

    $attribute = $stmt->fetch();

    if (!$attribute) {
        $pdo->rollBack();
        errorResponse('Характеристика не найдена', 404);
    }

    $valuesStmt = $pdo->prepare("
        SELECT COUNT(*) AS total
        FROM place_attributes
        WHERE attribute_definition_id = :attribute_definition_id
    ");

    $valuesStmt->execute([
        'attribute_definition_id' => $attributeId,
    ]);

    $valuesCount = (int) ($valuesStmt->fetch()['total'] ?? 0);

    if ($valuesCount > 0) {
        $pdo->rollBack();
        errorResponse('Нельзя удалить характеристику, которая уже используется в объявлениях', 422, [
            'places_count' => $valuesCount,
        ]);
    }

    $deleteStmt = $pdo->prepare("
        DELETE FROM attribute_definitions
        WHERE id = :id
        LIMIT 1
    ");

    $deleteStmt->execute([
        'id' => $attributeId,
    ]);

    writeModeratorLog(
        (int) $adminUser['id'],
        'delete_attribute',
        'attribute',
        $attributeId,
        'Удалена характеристика: ' . ($attribute['title'] ?? ('#' . $attributeId)),
        $pdo
    );

    $pdo->commit();

    successResponse([
        'message' => 'Характеристика удалена',
        'attribute_id' => $attributeId,
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось удалить характеристику', 500, [
        'error' => $e->getMessage(),
    ]);
}
