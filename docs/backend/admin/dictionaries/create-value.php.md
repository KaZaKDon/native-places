# api/admin/dictionaries/create-value.php

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

Создаёт новое значение внутри справочника.

Значение справочника хранится в таблице `reference_values` и относится к группе через `group_id`.

Endpoint:

1. проверяет JSON;
2. валидирует `group_id`, `title`, `code`;
3. проверяет существование справочника;
4. запрещает добавлять значения в отключённый справочник;
5. проверяет уникальность `code` внутри выбранного справочника;
6. вычисляет следующий `sort_order`;
7. создаёт значение;
8. пишет действие в лог модератора;
9. возвращает ID созданного значения.

## Метод и URL

```http
POST /api/admin/dictionaries/create-value.php
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
  "group_id": 1,
  "title": "Wi-Fi",
  "code": "wifi"
}
```

### Поля

| Поле | Тип | Обязательное | Описание |
|---|---:|---:|---|
| `group_id` | number | да | ID справочника |
| `title` | string | да | Название значения |
| `code` | string | да | Код значения |

## Валидация

### `group_id`

| Условие | Ошибка |
|---|---|
| Не передан или меньше/равен нулю | `Не передан ID справочника` |
| Справочник не найден | `Справочник не найден` |
| Справочник отключён | `Нельзя добавлять значения в отключённый справочник` |

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
| Код уже существует в этом справочнике | `Значение с таким кодом уже существует в этом справочнике` |

## Success response

Код ответа: `201`.

```json
{
  "success": true,
  "message": "Значение справочника создано",
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
    "group_id": "Не передан ID справочника",
    "title": "Введите значение справочника",
    "code": "Введите код значения"
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

### 422 — справочник отключён

```json
{
  "success": false,
  "message": "Нельзя добавлять значения в отключённый справочник"
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
  "message": "Не удалось создать значение справочника",
  "error": "..."
}
```

## Frontend notes

- Используется в админке для добавления значения в конкретный справочник.
- Перед отправкой нужно знать `group_id`.
- `code` должен быть уникальным внутри одного справочника.
- Одинаковый `code` в разных справочниках теоретически возможен, потому что проверка идёт по паре `group_id + code`.
- После успешного создания можно обновить список справочников через `index.php`.
- Ответ возвращает `value_id`.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdmin()`.
- Использует `moderator-log.php`.
- Создание выполняется внутри транзакции.
- При ошибке транзакция откатывается.
- `code` приводится к нижнему регистру через `mb_strtolower`.
- Новый элемент создаётся с `is_active = 1`.
- `sort_order` вычисляется как `MAX(sort_order) + 1` внутри конкретного `group_id`.
- После создания пишется лог действия `create_reference_value`.

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

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Файл перенесён в новую структуру документации `docs/backend/admin/dictionaries`. |