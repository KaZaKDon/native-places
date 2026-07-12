# api/admin/dictionaries/update-value.php

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

Обновляет значение справочника в таблице `reference_values`.

Endpoint:

1. проверяет JSON;
2. валидирует `id`, `title`, `code`;
3. проверяет существование значения;
4. проверяет уникальность нового `code` внутри того же справочника;
5. обновляет значение;
6. пишет действие в лог модератора;
7. возвращает ID обновлённого значения.

## Метод и URL

```http
POST /api/admin/dictionaries/update-value.php
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
  "id": 10,
  "title": "Wi-Fi",
  "code": "wifi"
}
```

### Поля

| Поле | Тип | Обязательное | Описание |
|---|---:|---:|---|
| `id` | number | да | ID значения справочника |
| `title` | string | да | Название значения |
| `code` | string | да | Код значения |

## Валидация

### `id`

| Условие | Ошибка |
|---|---|
| Не передан или меньше/равен нулю | `Не передан ID значения` |
| Значение не найдено | `Значение справочника не найдено` |

### `title`

| Условие | Ошибка |
|---|---|
| Пустое значение | `Введите значение справочника` |
| Длина больше 255 символов | `Значение справочника не должно быть длиннее 255 символов` |

### `code`

| Условие | Ошибка |
|---|---|
| Пустое значение | `Введите код значения` |
| Длина больше 100 символов | `Код значения не должен быть длиннее 100 символов` |
| Формат не `^[a-z0-9_]+$` | `Код может содержать только латинские буквы, цифры и подчёркивание` |
| Код уже существует в этом справочнике у другого значения | `Значение с таким кодом уже существует в этом справочнике` |

## Success response

```json
{
  "success": true,
  "message": "Значение справочника обновлено",
  "value_id": 10
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
    "id": "Не передан ID значения",
    "title": "Введите значение справочника",
    "code": "Введите код значения"
  }
}
```

### 404 — значение не найдено

```json
{
  "success": false,
  "message": "Значение справочника не найдено"
}
```

### 409 — значение с таким кодом уже существует

```json
{
  "success": false,
  "message": "Значение с таким кодом уже существует в этом справочнике",
  "errors": {
    "code": "Значение с таким кодом уже существует в этом справочнике"
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
  "message": "Не удалось обновить значение справочника",
  "error": "..."
}
```

## Frontend notes

- Используется для редактирования значения справочника.
- `group_id` в запросе не передаётся и не меняется.
- Endpoint обновляет значение в рамках уже существующего справочника.
- `code` должен быть уникальным внутри родительского справочника.
- После успешного обновления можно обновить список через `index.php`.
- Endpoint не меняет `sort_order` и `is_active`.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdmin()`.
- Использует `moderator-log.php`.
- Обновление выполняется внутри транзакции.
- При ошибке транзакция откатывается.
- `code` приводится к нижнему регистру через `mb_strtolower`.
- Проверка уникальности идёт внутри текущего `group_id` и исключает текущий `id`.
- После обновления пишется лог действия `update_reference_value`.

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

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Файл перенесён в новую структуру документации `docs/backend/admin/dictionaries`. |