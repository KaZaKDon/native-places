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
$title = trim($input['title'] ?? '');
$code = mb_strtolower(trim($input['code'] ?? ''));
$description = trim($input['description'] ?? '');

$errors = [];

if ($id <= 0) {
    $errors['id'] = 'Не передан ID справочника';
}

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

    $groupStmt = $pdo->prepare("
        SELECT id, title
        FROM reference_groups
        WHERE id = :id
        LIMIT 1
    ");

    $groupStmt->execute([
        'id' => $id,
    ]);

    $group = $groupStmt->fetch();

    if (!$group) {
        $pdo->rollBack();
        errorResponse('Справочник не найден', 404);
    }

    $existsStmt = $pdo->prepare("
        SELECT id
        FROM reference_groups
        WHERE code = :code
        AND id <> :id
        LIMIT 1
    ");

    $existsStmt->execute([
        'id' => $id,
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

    $stmt = $pdo->prepare("
        UPDATE reference_groups
        SET
            title = :title,
            code = :code,
            description = :description,
            updated_at = NOW()
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $id,
        'title' => $title,
        'code' => $code,
        'description' => $description !== '' ? $description : null,
    ]);

    writeModeratorLog(
        (int) $adminUser['id'],
        'update_reference_group',
        'reference_group',
        $id,
        'Обновлён справочник: ' . $title,
        $pdo
    );

    $pdo->commit();

    successResponse([
        'message' => 'Справочник обновлён',
        'group_id' => $id,
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось обновить справочник', 500, [
        'error' => $e->getMessage(),
    ]);
}
