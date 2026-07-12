# api/admin/dictionaries/update-group.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Dictionaries |
| Тип | PHP endpoint |
| Авторизация | Требуется admin session |
| Middleware | `requireAdmin()` |
| Логирование | `writeModeratorLog()` |
| Источник | `admin/docs/dphp_corrected_code_archive.md` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Обновляет справочник в таблице `reference_groups`.

Endpoint:

1. проверяет JSON;
2. валидирует `id`, `title`, `code`, `description`;
3. проверяет существование справочника;
4. проверяет уникальность нового `code`;
5. обновляет справочник;
6. пишет действие в лог модератора;
7. возвращает ID обновлённого справочника.

## Метод и URL

```http
POST /api/admin/dictionaries/update-group.php
```

## Авторизация

Требуется административная сессия.

Проверка выполняется через:

```php
$adminUser = requireAdmin();
```

То есть endpoint доступен именно администратору.

## Request

### Body

```json
{
  "id": 1,
  "title": "Удобства",
  "code": "amenities",
  "description": "Список удобств для мест"
}
```

### Поля

| Поле | Тип | Обязательное | Описание |
|---|---:|---:|---|
| `id` | number | да | ID справочника |
| `title` | string | да | Название справочника |
| `code` | string | да | Код справочника |
| `description` | string | нет | Описание справочника |

## Валидация

### `id`

| Условие | Ошибка |
|---|---|
| Не передан или меньше/равен нулю | `Не передан ID справочника` |
| Справочник не найден | `Справочник не найден` |

### `title`

| Условие | Ошибка |
|---|---|
| Пустое значение | `Введите название справочника` |
| Длина больше 255 символов | `Название справочника не должно быть длиннее 255 символов` |

### `code`

| Условие | Ошибка |
|---|---|
| Пустое значение | `Введите код справочника` |
| Длина больше 100 символов | `Код справочника не должен быть длиннее 100 символов` |
| Формат не `^[a-z0-9_]+$` | `Код может содержать только латинские буквы, цифры и подчёркивание` |
| Код уже существует у другого справочника | `Справочник с таким кодом уже существует` |

### `description`

| Условие | Ошибка |
|---|---|
| Длина больше 5000 символов | `Описание не должно быть длиннее 5000 символов` |

## Success response

```json
{
  "success": true,
  "message": "Справочник обновлён",
  "group_id": 1
}
```

## Error responses

### 400 — некорректный JSON

```json
{
  "success": false,
  "message": "Некорректный JSON"
}
```

### 422 — ошибка валидации

```json
{
  "success": false,
  "message": "Ошибка валидации",
  "errors": {
    "id": "Не передан ID справочника",
    "title": "Введите название справочника",
    "code": "Введите код справочника"
  }
}
```

### 404 — справочник не найден

```json
{
  "success": false,
  "message": "Справочник не найден"
}
```

### 409 — справочник с таким кодом уже существует

```json
{
  "success": false,
  "message": "Справочник с таким кодом уже существует",
  "errors": {
    "code": "Справочник с таким кодом уже существует"
  }
}
```

### 401 / 403 — нет доступа

Формируется в `requireAdmin()`.

Точный формат зависит от реализации `api/admin/shared/require-admin.php`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось обновить справочник",
  "error": "..."
}
```

## Frontend notes

- Используется для редактирования справочника.
- `code` можно менять, но нужно учитывать, что он может использоваться на frontend или в логике фильтров.
- После успешного обновления можно обновить список через `index.php`.
- Endpoint не меняет `sort_order` и `is_active`.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdmin()`.
- Использует `moderator-log.php`.
- Обновление выполняется внутри транзакции.
- При ошибке транзакция откатывается.
- `code` приводится к нижнему регистру через `mb_strtolower`.
- Проверка уникальности исключает текущий `id`.
- `description` сохраняется как `NULL`, если передана пустая строка.
- После обновления пишется лог действия `update_reference_group`.

## PHP-код

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

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Файл перенесён в новую структуру документации `docs/backend/admin/dictionaries`. |