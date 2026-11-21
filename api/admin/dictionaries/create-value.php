<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';
require_once __DIR__ . '/../shared/moderator-log.php';

$adminUser = requireAdmin();

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    errorResponse('Некорректный JSON', 400);
}

$groupId = (int) ($input['group_id'] ?? 0);
$title = trim($input['title'] ?? '');
$code = mb_strtolower(trim($input['code'] ?? ''));

$errors = [];

if ($groupId <= 0) {
    $errors['group_id'] = 'Не передан ID справочника';
}

if ($title === '') {
    $errors['title'] = 'Введите значение справочника';
} elseif (mb_strlen($title) > 255) {
    $errors['title'] = 'Значение справочника не должно быть длиннее 255 символов';
}

if ($code === '') {
    $errors['code'] = 'Введите код значения';
} elseif (mb_strlen($code) > 100) {
    $errors['code'] = 'Код значения не должен быть длиннее 100 символов';
} elseif (!preg_match('/^[a-z0-9_]+$/', $code)) {
    $errors['code'] = 'Код может содержать только латинские буквы, цифры и подчёркивание';
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
        SELECT id, title, is_active
        FROM reference_groups
        WHERE id = :id
        LIMIT 1
    ");

    $groupStmt->execute([
        'id' => $groupId,
    ]);

    $group = $groupStmt->fetch();

    if (!$group) {
        $pdo->rollBack();
        errorResponse('Справочник не найден', 404);
    }

    if ((int) $group['is_active'] !== 1) {
        $pdo->rollBack();
        errorResponse('Нельзя добавлять значения в отключённый справочник', 422);
    }

    $existsStmt = $pdo->prepare("
        SELECT id
        FROM reference_values
        WHERE group_id = :group_id
        AND code = :code
        LIMIT 1
    ");

    $existsStmt->execute([
        'group_id' => $groupId,
        'code' => $code,
    ]);

    if ($existsStmt->fetch()) {
        $pdo->rollBack();

        errorResponse('Значение с таким кодом уже существует в этом справочнике', 409, [
            'errors' => [
                'code' => 'Значение с таким кодом уже существует в этом справочнике',
            ],
        ]);
    }

    $sortStmt = $pdo->prepare("
        SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_sort
        FROM reference_values
        WHERE group_id = :group_id
    ");

    $sortStmt->execute([
        'group_id' => $groupId,
    ]);

    $nextSort = (int) ($sortStmt->fetch()['next_sort'] ?? 1);

    $stmt = $pdo->prepare("
        INSERT INTO reference_values (
            group_id,
            code,
            title,
            sort_order,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            :group_id,
            :code,
            :title,
            :sort_order,
            1,
            NOW(),
            NOW()
        )
    ");

    $stmt->execute([
        'group_id' => $groupId,
        'code' => $code,
        'title' => $title,
        'sort_order' => $nextSort,
    ]);

    $valueId = (int) $pdo->lastInsertId();

    writeModeratorLog(
        (int) $adminUser['id'],
        'create_reference_value',
        'reference_value',
        $valueId,
        'Создано значение справочника "' . ($group['title'] ?? ('#' . $groupId)) . '": ' . $title,
        $pdo
    );

    $pdo->commit();

    successResponse([
        'message' => 'Значение справочника создано',
        'value_id' => $valueId,
    ], 201);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось создать значение справочника', 500, [
        'error' => $e->getMessage(),
    ]);
}
