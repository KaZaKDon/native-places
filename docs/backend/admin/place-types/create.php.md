# api/admin/place-types/create.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Place Types |
| Тип | PHP endpoint |
| Авторизация | Требуется admin session |
| Middleware | `requireAdmin()` |
| Логирование | `writeModeratorLog()` |
| Источник | Код с хоста `api/admin/place-types/create.php` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Создаёт новый тип объекта внутри категории.

Тип объекта хранится в таблице `place_types` и привязан к категории через `category_id`.

Endpoint:

1. принимает категорию, название, код и порядок сортировки;
2. валидирует входные данные;
3. проверяет существование категории;
4. запрещает добавлять тип в отключённую категорию;
5. проверяет уникальность `code` внутри выбранной категории;
6. создаёт тип объекта;
7. пишет действие в лог модерации;
8. возвращает ID созданного типа.

## Метод и URL

```http
POST /api/admin/place-types/create.php
```

## Авторизация

Требуется административная сессия.

Проверка выполняется через:

```php
$adminUser = requireAdmin();
```

Endpoint доступен именно администратору.

## Request

### Body

```json
{
  "category_id": 1,
  "title": "Ресторан",
  "code": "restaurant",
  "sort_order": 10
}
```

### Поля

| Поле | Тип | Обязательное | Описание |
|---|---:|---:|---|
| `category_id` | number | да | ID категории |
| `title` | string | да | Название типа объекта |
| `code` | string | да | Код типа объекта |
| `sort_order` | number | нет | Порядок сортировки |

## Нормализация

Код типа приводится к нижнему регистру:

```php
$code = mb_strtolower($code, 'UTF-8');
```

Новый тип объекта создаётся активным:

```txt
is_active = 1
```

## Валидация

| Поле | Условие | Ошибка |
|---|---|---|
| `category_id` | Не передан или меньше/равен нулю | `Выберите категорию` |
| `title` | Пустой | `Введите название типа` |
| `title` | Длиннее 120 символов | `Название типа не должно быть длиннее 120 символов` |
| `code` | Пустой | `Введите код типа` |
| `code` | Не соответствует `^[a-z0-9_-]+$` | `Код может содержать только латинские буквы, цифры, дефис и подчёркивание` |
| `code` | Длиннее 80 символов | `Код типа не должен быть длиннее 80 символов` |
| `sort_order` | Меньше 0 | `Порядок сортировки не может быть отрицательным` |

## Success response

Код ответа: `201`.

```json
{
  "success": true,
  "message": "Тип объекта создан",
  "type_id": 5
}
```

## Error responses

### 422 — ошибка валидации

```json
{
  "success": false,
  "message": "Ошибка валидации",
  "errors": {
    "category_id": "Выберите категорию",
    "title": "Введите название типа",
    "code": "Введите код типа"
  }
}
```

### 404 — категория не найдена

```json
{
  "success": false,
  "message": "Категория не найдена"
}
```

### 422 — категория отключена

```json
{
  "success": false,
  "message": "Нельзя добавить тип объекта в отключённую категорию"
}
```

### 409 — тип с таким кодом уже есть в категории

```json
{
  "success": false,
  "message": "В этой категории уже есть тип объекта с таким кодом"
}
```

### 401 / 403 — нет доступа

Формируется в `requireAdmin()`.

Точный формат зависит от реализации `api/admin/shared/require-admin.php`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось создать тип объекта",
  "error": "..."
}
```

## Frontend notes

- Используется для создания типа объекта в админке.
- Перед созданием нужно выбрать активную категорию.
- `code` должен быть уникален внутри категории.
- Один и тот же `code` теоретически может существовать в разных категориях, если база это позволяет, потому что проверка идёт по паре `category_id + code`.
- После успешного создания нужно обновить список через `index.php`.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdmin()`.
- Использует `moderator-log.php`.
- Работает внутри транзакции.
- При ошибке транзакция откатывается.
- Проверяет существование и активность категории.
- Проверяет уникальность `code` внутри категории.
- Обрабатывает duplicate key `PDOException` с кодом `1062`.
- Логирует действие `create_place_type` для сущности `place_type`.

## PHP-код

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';
require_once __DIR__ . '/../shared/moderator-log.php';

$adminUser = requireAdmin();

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    $input = [];
}

$categoryId = (int) ($input['category_id'] ?? 0);
$title = trim((string) ($input['title'] ?? ''));
$code = trim((string) ($input['code'] ?? ''));
$sortOrder = (int) ($input['sort_order'] ?? 0);

$code = mb_strtolower($code, 'UTF-8');

$errors = [];

if ($categoryId <= 0) {
    $errors['category_id'] = 'Выберите категорию';
}

if ($title === '') {
    $errors['title'] = 'Введите название типа';
} elseif (mb_strlen($title, 'UTF-8') > 120) {
    $errors['title'] = 'Название типа не должно быть длиннее 120 символов';
}

if ($code === '') {
    $errors['code'] = 'Введите код типа';
} elseif (!preg_match('/^[a-z0-9_-]+$/', $code)) {
    $errors['code'] = 'Код может содержать только латинские буквы, цифры, дефис и подчёркивание';
} elseif (mb_strlen($code, 'UTF-8') > 80) {
    $errors['code'] = 'Код типа не должен быть длиннее 80 символов';
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
            is_active
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

    if ((int) $category['is_active'] !== 1) {
        $pdo->rollBack();
        errorResponse('Нельзя добавить тип объекта в отключённую категорию', 422);
    }

    $existsStmt = $pdo->prepare("
        SELECT id
        FROM place_types
        WHERE category_id = :category_id
        AND code = :code
        LIMIT 1
    ");

    $existsStmt->execute([
        'category_id' => $categoryId,
        'code' => $code,
    ]);

    if ($existsStmt->fetch()) {
        $pdo->rollBack();
        errorResponse('В этой категории уже есть тип объекта с таким кодом', 409);
    }

    $stmt = $pdo->prepare("
        INSERT INTO place_types (
            category_id,
            code,
            title,
            sort_order,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            :category_id,
            :code,
            :title,
            :sort_order,
            1,
            NOW(),
            NOW()
        )
    ");

    $stmt->execute([
        'category_id' => $categoryId,
        'code' => $code,
        'title' => $title,
        'sort_order' => $sortOrder,
    ]);

    $typeId = (int) $pdo->lastInsertId();

    writeModeratorLog(
        (int) $adminUser['id'],
        'create_place_type',
        'place_type',
        $typeId,
        'Создан тип объекта: ' . $title . ' (' . $code . ')',
        $pdo
    );

    $pdo->commit();

    successResponse([
        'message' => 'Тип объекта создан',
        'type_id' => $typeId,
    ], 201);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    if ($e instanceof PDOException && ($e->errorInfo[1] ?? null) === 1062) {
        errorResponse('В этой категории уже есть тип объекта с таким кодом', 409);
    }

    errorResponse('Не удалось создать тип объекта', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-05 | Файл оформлен по коду с хоста и перенесён в структуру `docs/backend/admin/place-types`. |