# Архив исправленного PHP-кода Native Places

Дата начала архива: 2026-06-27

Этот файл предназначен для хранения полных исправленных версий PHP endpoints, которые были разобраны в процессе сверки backend, базы данных и админки.

> Важно: файл пополняется постепенно. В архив добавляются только те PHP-файлы, которые уже были разобраны и для которых была подготовлена полная исправленная версия.

## Как пользоваться

1. Найти нужный путь файла в оглавлении.
2. Скопировать полный код из блока `php`.
3. Заменить соответствующий PHP-файл в основном backend-проекте.
4. Проверить реальные доступы/пароли/пути на сервере.

## Оглавление

- [`/api/admin/dictionaries/create-group.php`](#apiadmindictionariescreate-groupphp)
- [`/api/admin/dictionaries/create-value.php`](#apiadmindictionariescreate-valuephp)
- [`/api/admin/dictionaries/delete-value.php`](#apiadmindictionariesdelete-valuephp)
- [`/api/admin/dictionaries/index.php`](#apiadmindictionariesindexphp)
- [`/api/admin/dictionaries/update-group.php`](#apiadmindictionariesupdate-groupphp)
- [`/api/admin/dictionaries/update-value.php`](#apiadmindictionariesupdate-valuephp)

---

## `/api/admin/dictionaries/create-group.php`

```php
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
```

---

## `/api/admin/dictionaries/create-value.php`

```php
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
```

---

## `/api/admin/dictionaries/delete-value.php`

```php
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

if ($id <= 0) {
    errorResponse('Не передан ID значения', 422);
}

try {
    $pdo = getDatabaseConnection();

    $pdo->beginTransaction();

    $valueStmt = $pdo->prepare("
        SELECT
            rv.id,
            rv.group_id,
            rv.code,
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

    $deleteStmt = $pdo->prepare("
        DELETE FROM reference_values
        WHERE id = :id
        LIMIT 1
    ");

    $deleteStmt->execute([
        'id' => $id,
    ]);

    writeModeratorLog(
        (int) $adminUser['id'],
        'delete_reference_value',
        'reference_value',
        $id,
        'Удалено значение справочника "' . ($value['group_title'] ?? ('#' . $value['group_id'])) . '": ' . ($value['title'] ?? ('#' . $id)),
        $pdo
    );

    $pdo->commit();

    successResponse([
        'message' => 'Значение справочника удалено',
        'value_id' => $id,
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось удалить значение справочника', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

---

## `/api/admin/dictionaries/index.php`

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdminOrModerator();

try {
    $pdo = getDatabaseConnection();

    $groupsStmt = $pdo->query("
        SELECT
            rg.id,
            rg.code,
            rg.title,
            rg.description,
            rg.sort_order,
            rg.is_active,
            rg.created_at,
            rg.updated_at,
            COALESCE(rv_counts.values_count, 0) AS values_count,
            COALESCE(ad_counts.attributes_count, 0) AS attributes_count
        FROM reference_groups rg
        LEFT JOIN (
            SELECT
                group_id,
                COUNT(*) AS values_count
            FROM reference_values
            GROUP BY group_id
        ) rv_counts
            ON rv_counts.group_id = rg.id
        LEFT JOIN (
            SELECT
                reference_group_id,
                COUNT(*) AS attributes_count
            FROM attribute_definitions
            WHERE reference_group_id IS NOT NULL
            GROUP BY reference_group_id
        ) ad_counts
            ON ad_counts.reference_group_id = rg.id
        ORDER BY
            rg.sort_order ASC,
            rg.id ASC
    ");

    $valuesStmt = $pdo->query("
        SELECT
            rv.id,
            rv.group_id,
            rv.code,
            rv.title,
            rv.sort_order,
            rv.is_active,
            rv.created_at,
            rv.updated_at,
            rg.code AS group_code,
            rg.title AS group_title
        FROM reference_values rv
        INNER JOIN reference_groups rg
            ON rg.id = rv.group_id
        ORDER BY
            rg.sort_order ASC,
            rg.id ASC,
            rv.sort_order ASC,
            rv.id ASC
    ");

    successResponse([
        'groups' => $groupsStmt->fetchAll(),
        'values' => $valuesStmt->fetchAll(),
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить справочники', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

---

## `/api/admin/dictionaries/update-group.php`

```php
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
```

---

## `/api/admin/dictionaries/update-value.php`

```php
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
```
