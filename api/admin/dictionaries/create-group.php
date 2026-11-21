<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';
require_once __DIR__ . '/../shared/moderator-log.php';

$adminUser = requireAdmin();

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    errorResponse('Некорректный JSON', 400);
}

$title = trim($input['title'] ?? '');
$code = mb_strtolower(trim($input['code'] ?? ''));
$description = trim($input['description'] ?? '');

$errors = [];

if ($title === '') {
    $errors['title'] = 'Введите название справочника';
} elseif (mb_strlen($title) > 255) {
    $errors['title'] = 'Название справочника не должно быть длиннее 255 символов';
}

if ($code === '') {
    $errors['code'] = 'Введите код справочника';
} elseif (mb_strlen($code) > 100) {
    $errors['code'] = 'Код справочника не должен быть длиннее 100 символов';
} elseif (!preg_match('/^[a-z0-9_]+$/', $code)) {
    $errors['code'] = 'Код может содержать только латинские буквы, цифры и подчёркивание';
}

if ($description !== '' && mb_strlen($description) > 5000) {
    $errors['description'] = 'Описание не должно быть длиннее 5000 символов';
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
        FROM reference_groups
        WHERE code = :code
        LIMIT 1
    ");

    $existsStmt->execute([
        'code' => $code,
    ]);

    if ($existsStmt->fetch()) {
        $pdo->rollBack();

        errorResponse('Справочник с таким кодом уже существует', 409, [
            'errors' => [
                'code' => 'Справочник с таким кодом уже существует',
            ],
        ]);
    }

    $sortStmt = $pdo->query("
        SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_sort
        FROM reference_groups
    ");

    $nextSort = (int) ($sortStmt->fetch()['next_sort'] ?? 1);

    $stmt = $pdo->prepare("
        INSERT INTO reference_groups (
            code,
            title,
            description,
            sort_order,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            :code,
            :title,
            :description,
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
        'sort_order' => $nextSort,
    ]);

    $groupId = (int) $pdo->lastInsertId();

    writeModeratorLog(
        (int) $adminUser['id'],
        'create_reference_group',
        'reference_group',
        $groupId,
        'Создан справочник: ' . $title,
        $pdo
    );

    $pdo->commit();

    successResponse([
        'message' => 'Справочник успешно создан',
        'group_id' => $groupId,
    ], 201);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось создать справочник', 500, [
        'error' => $e->getMessage(),
    ]);
}
