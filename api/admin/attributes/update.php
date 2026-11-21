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
$categoryId = (int) ($input['category_id'] ?? 0);
$title = trim((string) ($input['title'] ?? ''));
$code = trim((string) ($input['code'] ?? ''));
$fieldType = trim((string) ($input['field_type'] ?? ''));
$referenceGroupId = !empty($input['reference_group_id'])
    ? (int) $input['reference_group_id']
    : null;
$isRequired = in_array($input['is_required'] ?? 0, [1, '1', true, 'true', 'on', 'yes'], true) ? 1 : 0;
$isFilterable = in_array($input['is_filterable'] ?? 0, [1, '1', true, 'true', 'on', 'yes'], true) ? 1 : 0;
$sortOrder = (int) ($input['sort_order'] ?? 0);

$code = mb_strtolower($code, 'UTF-8');

$allowedFieldTypes = ['text', 'textarea', 'number', 'boolean', 'select'];
$errors = [];

if ($attributeId <= 0) {
    $errors['id'] = 'Не передан ID характеристики';
}

if ($categoryId <= 0) {
    $errors['category_id'] = 'Выберите категорию';
}

if ($title === '') {
    $errors['title'] = 'Введите название характеристики';
} elseif (mb_strlen($title, 'UTF-8') > 255) {
    $errors['title'] = 'Название характеристики не должно быть длиннее 255 символов';
}

if ($code === '') {
    $errors['code'] = 'Введите ключ характеристики';
} elseif (!preg_match('/^[a-z0-9_-]+$/', $code)) {
    $errors['code'] = 'Ключ может содержать только латинские буквы, цифры, дефис и подчёркивание';
} elseif (mb_strlen($code, 'UTF-8') > 100) {
    $errors['code'] = 'Ключ характеристики не должен быть длиннее 100 символов';
}

if (!in_array($fieldType, $allowedFieldTypes, true)) {
    $errors['field_type'] = 'Выберите корректный тип поля';
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

    $attributeStmt = $pdo->prepare("
        SELECT
            id,
            title,
            code
        FROM attribute_definitions
        WHERE id = :id
        LIMIT 1
    ");

    $attributeStmt->execute([
        'id' => $attributeId,
    ]);

    $attribute = $attributeStmt->fetch();

    if (!$attribute) {
        $pdo->rollBack();
        errorResponse('Характеристика не найдена', 404);
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
        errorResponse('Нельзя перенести характеристику в отключённую категорию', 422);
    }

    if ($referenceGroupId !== null) {
        $referenceGroupStmt = $pdo->prepare("
            SELECT id
            FROM reference_groups
            WHERE id = :id
            AND is_active = 1
            LIMIT 1
        ");

        $referenceGroupStmt->execute([
            'id' => $referenceGroupId,
        ]);

        if (!$referenceGroupStmt->fetch()) {
            $pdo->rollBack();
            errorResponse('Справочник для характеристики не найден или отключён', 404);
        }
    }

    $existsStmt = $pdo->prepare("
        SELECT id
        FROM attribute_definitions
        WHERE category_id = :category_id
        AND code = :code
        AND id <> :id
        LIMIT 1
    ");

    $existsStmt->execute([
        'category_id' => $categoryId,
        'code' => $code,
        'id' => $attributeId,
    ]);

    if ($existsStmt->fetch()) {
        $pdo->rollBack();
        errorResponse('Характеристика с таким ключом уже существует в этой категории', 409);
    }

    $stmt = $pdo->prepare("
        UPDATE attribute_definitions
        SET
            category_id = :category_id,
            code = :code,
            title = :title,
            field_type = :field_type,
            reference_group_id = :reference_group_id,
            is_required = :is_required,
            is_filterable = :is_filterable,
            sort_order = :sort_order,
            updated_at = NOW()
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $attributeId,
        'category_id' => $categoryId,
        'code' => $code,
        'title' => $title,
        'field_type' => $fieldType,
        'reference_group_id' => $referenceGroupId,
        'is_required' => $isRequired,
        'is_filterable' => $isFilterable,
        'sort_order' => $sortOrder,
    ]);

    writeModeratorLog(
        (int) $adminUser['id'],
        'update_attribute',
        'attribute',
        $attributeId,
        'Обновлена характеристика: ' . $title . ' (' . $code . ')',
        $pdo
    );

    $pdo->commit();

    successResponse([
        'message' => 'Характеристика обновлена',
        'attribute_id' => $attributeId,
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    if ($e instanceof PDOException && ($e->errorInfo[1] ?? null) === 1062) {
        errorResponse('Характеристика с таким ключом уже существует в этой категории', 409);
    }

    errorResponse('Не удалось обновить характеристику', 500, [
        'error' => $e->getMessage(),
    ]);
}
