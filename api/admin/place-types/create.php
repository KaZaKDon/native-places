<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';
require_once __DIR__ . '/../shared/moderator-log.php';

$adminUser = requireAdmin();

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    $input = [];
}

$categoryId = (int) ($input['category_id'] ?? 0);
$title = trim((string) ($input['title'] ?? ''));
$code = trim((string) ($input['code'] ?? ''));
$sortOrder = (int) ($input['sort_order'] ?? 0);

$code = mb_strtolower($code, 'UTF-8');

$errors = [];

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
        errorResponse('Нельзя добавить тип объекта в отключённую категорию', 422);
    }

    $existsStmt = $pdo->prepare("
        SELECT id
        FROM place_types
        WHERE category_id = :category_id
        AND code = :code
        LIMIT 1
    ");

    $existsStmt->execute([
        'category_id' => $categoryId,
        'code' => $code,
    ]);

    if ($existsStmt->fetch()) {
        $pdo->rollBack();
        errorResponse('В этой категории уже есть тип объекта с таким кодом', 409);
    }

    $stmt = $pdo->prepare("
        INSERT INTO place_types (
            category_id,
            code,
            title,
            sort_order,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            :category_id,
            :code,
            :title,
            :sort_order,
            1,
            NOW(),
            NOW()
        )
    ");

    $stmt->execute([
        'category_id' => $categoryId,
        'code' => $code,
        'title' => $title,
        'sort_order' => $sortOrder,
    ]);

    $typeId = (int) $pdo->lastInsertId();

    writeModeratorLog(
        (int) $adminUser['id'],
        'create_place_type',
        'place_type',
        $typeId,
        'Создан тип объекта: ' . $title . ' (' . $code . ')',
        $pdo
    );

    $pdo->commit();

    successResponse([
        'message' => 'Тип объекта создан',
        'type_id' => $typeId,
    ], 201);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    if ($e instanceof PDOException && ($e->errorInfo[1] ?? null) === 1062) {
        errorResponse('В этой категории уже есть тип объекта с таким кодом', 409);
    }

    errorResponse('Не удалось создать тип объекта', 500, [
        'error' => $e->getMessage(),
    ]);
}
