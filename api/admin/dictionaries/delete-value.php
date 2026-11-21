<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';
require_once __DIR__ . '/../shared/moderator-log.php';

$adminUser = requireAdmin();

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    errorResponse('Некорректный JSON', 400);
}

$id = (int) ($input['id'] ?? 0);

if ($id <= 0) {
    errorResponse('Не передан ID значения', 422);
}

try {
    $pdo = getDatabaseConnection();

    $pdo->beginTransaction();

    $valueStmt = $pdo->prepare("
        SELECT
            rv.id,
            rv.group_id,
            rv.code,
            rv.title,
            rg.title AS group_title
        FROM reference_values rv
        INNER JOIN reference_groups rg
            ON rg.id = rv.group_id
        WHERE rv.id = :id
        LIMIT 1
    ");

    $valueStmt->execute([
        'id' => $id,
    ]);

    $value = $valueStmt->fetch();

    if (!$value) {
        $pdo->rollBack();
        errorResponse('Значение справочника не найдено', 404);
    }

    $deleteStmt = $pdo->prepare("
        DELETE FROM reference_values
        WHERE id = :id
        LIMIT 1
    ");

    $deleteStmt->execute([
        'id' => $id,
    ]);

    writeModeratorLog(
        (int) $adminUser['id'],
        'delete_reference_value',
        'reference_value',
        $id,
        'Удалено значение справочника "' . ($value['group_title'] ?? ('#' . $value['group_id'])) . '": ' . ($value['title'] ?? ('#' . $id)),
        $pdo
    );

    $pdo->commit();

    successResponse([
        'message' => 'Значение справочника удалено',
        'value_id' => $id,
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось удалить значение справочника', 500, [
        'error' => $e->getMessage(),
    ]);
}
