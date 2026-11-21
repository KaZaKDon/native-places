<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';
require_once __DIR__ . '/../shared/moderator-log.php';

$adminUser = requireAdmin();

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    $input = [];
}

$categoryId = (int) ($input['id'] ?? 0);

$isActiveRaw = $input['is_active'] ?? 0;
$isActive = in_array($isActiveRaw, [1, '1', true, 'true', 'on', 'yes'], true) ? 1 : 0;

if ($categoryId <= 0) {
    errorResponse('Не передан ID категории', 422);
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
        FROM categories
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $categoryId,
    ]);

    $category = $stmt->fetch();

    if (!$category) {
        $pdo->rollBack();
        errorResponse('Категория не найдена', 404);
    }

    if ($isActive === 0) {
        $placesStmt = $pdo->prepare("
            SELECT COUNT(*) AS total
            FROM places
            WHERE category_id = :category_id
        ");

        $placesStmt->execute([
            'category_id' => $categoryId,
        ]);

        $placesCount = (int) ($placesStmt->fetch()['total'] ?? 0);

        if ($placesCount > 0) {
            $pdo->rollBack();
            errorResponse('Нельзя отключить категорию, в которой есть объявления', 422, [
                'places_count' => $placesCount,
            ]);
        }
    }

    $updateStmt = $pdo->prepare("
        UPDATE categories
        SET
            is_active = :is_active,
            updated_at = NOW()
        WHERE id = :id
        LIMIT 1
    ");

    $updateStmt->execute([
        'id' => $categoryId,
        'is_active' => $isActive,
    ]);

    writeModeratorLog(
        (int) $adminUser['id'],
        $isActive ? 'enable_category' : 'disable_category',
        'category',
        $categoryId,
        ($isActive ? 'Включена категория: ' : 'Отключена категория: ') . ($category['title'] ?? ('#' . $categoryId)),
        $pdo
    );

    $pdo->commit();

    successResponse([
        'message' => $isActive ? 'Категория включена' : 'Категория отключена',
        'category_id' => $categoryId,
        'is_active' => $isActive,
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось изменить статус категории', 500, [
        'error' => $e->getMessage(),
    ]);
}
