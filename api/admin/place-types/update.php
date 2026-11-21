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
$categoryId = (int) ($input['category_id'] ?? 0);
$title = trim((string) ($input['title'] ?? ''));
$code = trim((string) ($input['code'] ?? ''));
$sortOrder = (int) ($input['sort_order'] ?? 0);

$code = mb_strtolower($code, 'UTF-8');

$errors = [];

if ($typeId <= 0) {
    $errors['id'] = 'Не передан ID типа объекта';
}

if ($categoryId <= 0) {
    $errors['category_id'] = 'Выберите категорию';
}

if ($title === '') {
    $errors['title'] = 'Введите название типа';
} elseif (mb_strlen($title, 'UTF-8') > 120) {
    $errors['title'] = 'Название типа не должно быть длиннее 120 символов';
}

if ($code === '') {
    $errors['code'] = 'Введите код типа';
} elseif (!preg_match('/^[a-z0-9_-]+$/', $code)) {
    $errors['code'] = 'Код может содержать только латинские буквы, цифры, дефис и подчёркивание';
} elseif (mb_strlen($code, 'UTF-8') > 80) {
    $errors['code'] = 'Код типа не должен быть длиннее 80 символов';
}

if ($sortOrder < 0) {
    $errors['sort_order'] = 'Порядок сортировки не может быть отрицательным';
}

if (!empty($errors)) {
    errorResponse('Ошибка валидации', 422, [
        'errors' => $errors,
    ]);
}

try {
    $pdo = getDatabaseConnection();

    $pdo->beginTransaction();

    $typeStmt = $pdo->prepare("
        SELECT
            id,
            category_id,
            title,
            code
        FROM place_types
        WHERE id = :id
        LIMIT 1
    ");

    $typeStmt->execute([
        'id' => $typeId,
    ]);

    $type = $typeStmt->fetch();

    if (!$type) {
        $pdo->rollBack();
        errorResponse('Тип объекта не найден', 404);
    }

    $categoryStmt = $pdo->prepare("
        SELECT
            id,
            title,
            is_active
        FROM categories
        WHERE id = :id
        LIMIT 1
    ");

    $categoryStmt->execute([
        'id' => $categoryId,
    ]);

    $category = $categoryStmt->fetch();

    if (!$category) {
        $pdo->rollBack();
        errorResponse('Категория не найдена', 404);
    }

    if ((int) $category['is_active'] !== 1) {
        $pdo->rollBack();
        errorResponse('Нельзя перенести тип объекта в отключённую категорию', 422);
    }

    $existsStmt = $pdo->prepare("
        SELECT id
        FROM place_types
        WHERE category_id = :category_id
        AND code = :code
        AND id <> :id
        LIMIT 1
    ");

    $existsStmt->execute([
        'category_id' => $categoryId,
        'code' => $code,
        'id' => $typeId,
    ]);

    if ($existsStmt->fetch()) {
        $pdo->rollBack();
        errorResponse('В этой категории уже есть тип объекта с таким кодом', 409);
    }

    $stmt = $pdo->prepare("
        UPDATE place_types
        SET
            category_id = :category_id,
            code = :code,
            title = :title,
            sort_order = :sort_order,
            updated_at = NOW()
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $typeId,
        'category_id' => $categoryId,
        'code' => $code,
        'title' => $title,
        'sort_order' => $sortOrder,
    ]);

    writeModeratorLog(
        (int) $adminUser['id'],
        'update_place_type',
        'place_type',
        $typeId,
        'Обновлён тип объекта: ' . $title . ' (' . $code . ')',
        $pdo
    );

    $pdo->commit();

    successResponse([
        'message' => 'Тип объекта обновлён',
        'type_id' => $typeId,
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    if ($e instanceof PDOException && ($e->errorInfo[1] ?? null) === 1062) {
        errorResponse('В этой категории уже есть тип объекта с таким кодом', 409);
    }

    errorResponse('Не удалось обновить тип объекта', 500, [
        'error' => $e->getMessage(),
    ]);
}
