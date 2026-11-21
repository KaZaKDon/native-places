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
$title = trim((string) ($input['title'] ?? ''));
$code = trim((string) ($input['code'] ?? ''));
$description = trim((string) ($input['description'] ?? ''));
$icon = trim((string) ($input['icon'] ?? ''));
$color = trim((string) ($input['color'] ?? ''));
$sortOrder = (int) ($input['sort_order'] ?? 0);

$code = mb_strtolower($code, 'UTF-8');

$errors = [];

if ($categoryId <= 0) {
    $errors['id'] = 'Не передан ID категории';
}

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

    $categoryStmt = $pdo->prepare("
        SELECT
            id,
            title,
            code
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

    $existsStmt = $pdo->prepare("
        SELECT id
        FROM categories
        WHERE code = :code
        AND id <> :id
        LIMIT 1
    ");

    $existsStmt->execute([
        'code' => $code,
        'id' => $categoryId,
    ]);

    if ($existsStmt->fetch()) {
        $pdo->rollBack();
        errorResponse('Категория с таким кодом уже существует', 409);
    }

    $stmt = $pdo->prepare("
        UPDATE categories
        SET
            code = :code,
            title = :title,
            description = :description,
            icon = :icon,
            color = :color,
            sort_order = :sort_order,
            updated_at = NOW()
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $categoryId,
        'code' => $code,
        'title' => $title,
        'description' => $description !== '' ? $description : null,
        'icon' => $icon !== '' ? $icon : null,
        'color' => $color !== '' ? $color : null,
        'sort_order' => $sortOrder,
    ]);

    writeModeratorLog(
        (int) $adminUser['id'],
        'update_category',
        'category',
        $categoryId,
        'Обновлена категория: ' . $title . ' (' . $code . ')',
        $pdo
    );

    $pdo->commit();

    successResponse([
        'message' => 'Категория обновлена',
        'category_id' => $categoryId,
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    if ($e instanceof PDOException && ($e->errorInfo[1] ?? null) === 1062) {
        errorResponse('Категория с таким кодом уже существует', 409);
    }

    errorResponse('Не удалось обновить категорию', 500, [
        'error' => $e->getMessage(),
    ]);
}
