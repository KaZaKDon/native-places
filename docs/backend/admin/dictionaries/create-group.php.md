# api/admin/dictionaries/create-group.php

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

Создаёт новый справочник.

Справочник — это группа значений в таблице `reference_groups`.

Например:

- типы объектов;
- удобства;
- особенности;
- любые другие списки, которые потом могут использоваться в атрибутах или фильтрах.

Endpoint:

1. проверяет JSON;
2. валидирует `title`, `code`, `description`;
3. проверяет уникальность кода справочника;
4. вычисляет следующий `sort_order`;
5. создаёт запись в `reference_groups`;
6. пишет действие в лог модератора;
7. возвращает ID созданного справочника.

## Метод и URL

```http
POST /api/admin/dictionaries/create-group.php
```

## Авторизация

Требуется административная сессия.

Проверка выполняется через:

```php
$adminUser = requireAdmin();
```

То есть endpoint доступен именно администратору, не просто модератору.

## Request

### Body

```json
{
  "title": "Удобства",
  "code": "amenities",
  "description": "Список удобств для мест"
}
```

### Поля

| Поле | Тип | Обязательное | Описание |
|---|---:|---:|---|
| `title` | string | да | Название справочника |
| `code` | string | да | Код справочника |
| `description` | string | нет | Описание справочника |

## Валидация

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
| Код уже существует | `Справочник с таким кодом уже существует` |

### `description`

| Условие | Ошибка |
|---|---|
| Длина больше 5000 символов | `Описание не должно быть длиннее 5000 символов` |

## Success response

Код ответа: `201`.

```json
{
  "success": true,
  "message": "Справочник успешно создан",
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
    "title": "Введите название справочника",
    "code": "Введите код справочника"
  }
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
  "message": "Не удалось создать справочник",
  "error": "..."
}
```

## Frontend notes

- Используется в админке для создания новой группы справочника.
- `code` лучше автоматически приводить к латинице/slug на frontend, но backend всё равно валидирует формат.
- Код должен содержать только:
  - маленькие латинские буквы;
  - цифры;
  - подчёркивание.
- После успешного создания можно обновить список справочников через `index.php`.
- Ответ возвращает `group_id`.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdmin()`.
- Использует `moderator-log.php`.
- Создание выполняется внутри транзакции.
- При ошибке транзакция откатывается.
- `code` приводится к нижнему регистру через `mb_strtolower`.
- `description` сохраняется как `NULL`, если передана пустая строка.
- `sort_order` вычисляется как `MAX(sort_order) + 1`.
- Новый справочник создаётся с `is_active = 1`.
- После создания пишется лог действия `create_reference_group`.

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

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Файл перенесён в новую структуру документации `docs/backend/admin/dictionaries`. |