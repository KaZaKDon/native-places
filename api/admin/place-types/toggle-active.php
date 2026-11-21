<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';
require_once __DIR__ . '/../shared/moderator-log.php';

$adminUser = requireAdmin();

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    $input = [];
}

$typeId = (int) ($input['id'] ?? 0);

$isActiveRaw = $input['is_active'] ?? 0;
$isActive = in_array($isActiveRaw, [1, '1', true, 'true', 'on', 'yes'], true) ? 1 : 0;

if ($typeId <= 0) {
    errorResponse('Не передан ID типа объекта', 422);
}

try {
    $pdo = getDatabaseConnection();

    $pdo->beginTransaction();

    $stmt = $pdo->prepare("
        SELECT
            id,
            title,
            code,
            is_active
        FROM place_types
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $typeId,
    ]);

    $type = $stmt->fetch();

    if (!$type) {
        $pdo->rollBack();
        errorResponse('Тип объекта не найден', 404);
    }

    if ($isActive === 0) {
        $placesStmt = $pdo->prepare("
            SELECT COUNT(*) AS total
            FROM places
            WHERE place_type_id = :place_type_id
        ");

        $placesStmt->execute([
            'place_type_id' => $typeId,
        ]);

        $placesCount = (int) ($placesStmt->fetch()['total'] ?? 0);

        if ($placesCount > 0) {
            $pdo->rollBack();
            errorResponse('Нельзя отключить тип объекта, к которому привязаны объявления', 422, [
                'places_count' => $placesCount,
            ]);
        }
    }

    $updateStmt = $pdo->prepare("
        UPDATE place_types
        SET
            is_active = :is_active,
            updated_at = NOW()
        WHERE id = :id
        LIMIT 1
    ");

    $updateStmt->execute([
        'id' => $typeId,
        'is_active' => $isActive,
    ]);

    writeModeratorLog(
        (int) $adminUser['id'],
        $isActive ? 'enable_place_type' : 'disable_place_type',
        'place_type',
        $typeId,
        ($isActive ? 'Включён тип объекта: ' : 'Отключён тип объекта: ') . ($type['title'] ?? ('#' . $typeId)),
        $pdo
    );

    $pdo->commit();

    successResponse([
        'message' => $isActive ? 'Тип объекта включён' : 'Тип объекта отключён',
        'type_id' => $typeId,
        'is_active' => $isActive,
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось изменить статус типа объекта', 500, [
        'error' => $e->getMessage(),
    ]);
}
