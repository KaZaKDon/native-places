<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';
require_once __DIR__ . '/../shared/moderator-log.php';

$adminUser = requireAdmin();

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    $input = [];
}

$title = trim((string) ($input['title'] ?? ''));
$code = trim((string) ($input['code'] ?? ''));
$description = trim((string) ($input['description'] ?? ''));
$icon = trim((string) ($input['icon'] ?? ''));
$color = trim((string) ($input['color'] ?? ''));
$sortOrder = (int) ($input['sort_order'] ?? 0);

$code = mb_strtolower($code, 'UTF-8');

$errors = [];

if ($title === '') {
    $errors['title'] = 'Введите название категории';
} elseif (mb_strlen($title, 'UTF-8') > 100) {
    $errors['title'] = 'Название категории не должно быть длиннее 100 символов';
}

if ($code === '') {
    $errors['code'] = 'Введите код категории';
} elseif (!preg_match('/^[a-z0-9_-]+$/', $code)) {
    $errors['code'] = 'Код может содержать только латинские буквы, цифры, дефис и подчёркивание';
} elseif (mb_strlen($code, 'UTF-8') > 50) {
    $errors['code'] = 'Код категории не должен быть длиннее 50 символов';
}

if ($icon !== '' && mb_strlen($icon, 'UTF-8') > 50) {
    $errors['icon'] = 'Иконка не должна быть длиннее 50 символов';
}

if ($color !== '' && mb_strlen($color, 'UTF-8') > 30) {
    $errors['color'] = 'Цвет не должен быть длиннее 30 символов';
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

    $existsStmt = $pdo->prepare("
        SELECT id
        FROM categories
        WHERE code = :code
        LIMIT 1
    ");

    $existsStmt->execute([
        'code' => $code,
    ]);

    if ($existsStmt->fetch()) {
        $pdo->rollBack();
        errorResponse('Категория с таким кодом уже существует', 409);
    }

    $stmt = $pdo->prepare("
        INSERT INTO categories (
            code,
            title,
            description,
            icon,
            color,
            sort_order,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            :code,
            :title,
            :description,
            :icon,
            :color,
            :sort_order,
            1,
            NOW(),
            NOW()
        )
    ");

    $stmt->execute([
        'code' => $code,
        'title' => $title,
        'description' => $description !== '' ? $description : null,
        'icon' => $icon !== '' ? $icon : null,
        'color' => $color !== '' ? $color : null,
        'sort_order' => $sortOrder,
    ]);

    $categoryId = (int) $pdo->lastInsertId();

    writeModeratorLog(
        (int) $adminUser['id'],
        'create_category',
        'category',
        $categoryId,
        'Создана категория: ' . $title . ' (' . $code . ')',
        $pdo
    );

    $pdo->commit();

    successResponse([
        'message' => 'Категория создана',
        'category_id' => $categoryId,
    ], 201);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    if ($e instanceof PDOException && ($e->errorInfo[1] ?? null) === 1062) {
        errorResponse('Категория с таким кодом уже существует', 409);
    }

    errorResponse('Не удалось создать категорию', 500, [
        'error' => $e->getMessage(),
    ]);
}
