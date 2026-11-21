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

$errors = [];

if ($id <= 0) {
    $errors['id'] = 'Не передан ID значения';
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

    $valueStmt = $pdo->prepare("
        SELECT
            rv.id,
            rv.group_id,
            rv.title,
            rg.title AS group_title
        FROM reference_values rv
        INNER JOIN reference_groups rg
            ON rg.id = rv.group_id
        WHERE rv.id = :id
        LIMIT 1
    ");

    $valueStmt->execute([
        'id' => $id,
    ]);

    $value = $valueStmt->fetch();

    if (!$value) {
        $pdo->rollBack();
        errorResponse('Значение справочника не найдено', 404);
    }

    $existsStmt = $pdo->prepare("
        SELECT id
        FROM reference_values
        WHERE group_id = :group_id
        AND code = :code
        AND id <> :id
        LIMIT 1
    ");

    $existsStmt->execute([
        'group_id' => (int) $value['group_id'],
        'code' => $code,
        'id' => $id,
    ]);

    if ($existsStmt->fetch()) {
        $pdo->rollBack();

        errorResponse('Значение с таким кодом уже существует в этом справочнике', 409, [
            'errors' => [
                'code' => 'Значение с таким кодом уже существует в этом справочнике',
            ],
        ]);
    }

    $stmt = $pdo->prepare("
        UPDATE reference_values
        SET
            title = :title,
            code = :code,
            updated_at = NOW()
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $id,
        'title' => $title,
        'code' => $code,
    ]);

    writeModeratorLog(
        (int) $adminUser['id'],
        'update_reference_value',
        'reference_value',
        $id,
        'Обновлено значение справочника "' . ($value['group_title'] ?? ('#' . $value['group_id'])) . '": ' . $title,
        $pdo
    );

    $pdo->commit();

    successResponse([
        'message' => 'Значение справочника обновлено',
        'value_id' => $id,
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось обновить значение справочника', 500, [
        'error' => $e->getMessage(),
    ]);
}
