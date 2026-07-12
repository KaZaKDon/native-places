# api/admin/attributes/create.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Attributes |
| Тип | PHP endpoint |
| Авторизация | Требуется admin session |
| Middleware | `requireAdmin()` |
| Логирование | `writeModeratorLog()` |
| Источник | Код с хоста `api/admin/attributes/create.php` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Создаёт новую характеристику объявления.

Характеристика хранится в таблице `attribute_definitions` и привязана к категории через `category_id`.

Endpoint:

1. принимает категорию, название, ключ, тип поля и дополнительные настройки;
2. валидирует входные данные;
3. проверяет существование и активность категории;
4. если указан справочник — проверяет его существование и активность;
5. проверяет уникальность ключа характеристики внутри категории;
6. создаёт характеристику;
7. пишет действие в лог модерации;
8. возвращает ID созданной характеристики.

## Метод и URL

```http
POST /api/admin/attributes/create.php
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
  "title": "Wi-Fi",
  "code": "wifi",
  "field_type": "boolean",
  "reference_group_id": null,
  "is_required": false,
  "is_filterable": true,
  "sort_order": 10
}
```

### Поля

| Поле | Тип | Обязательное | Описание |
|---|---:|---:|---|
| `category_id` | number | да | ID категории |
| `title` | string | да | Название характеристики |
| `code` | string | да | Ключ характеристики |
| `field_type` | string | да | Тип поля |
| `reference_group_id` | number/null | нет | ID справочника |
| `is_required` | mixed | нет | Обязательность |
| `is_filterable` | mixed | нет | Можно использовать в фильтрах |
| `sort_order` | number | нет | Порядок сортировки |

## Allowed field types

```php
$allowedFieldTypes = ['text', 'textarea', 'number', 'boolean', 'select'];
```

| Значение | Описание |
|---|---|
| `text` | Текст |
| `textarea` | Большой текст |
| `number` | Число |
| `boolean` | Да / Нет |
| `select` | Выбор одного значения |

## Нормализация

Код характеристики приводится к нижнему регистру:

```php
$code = mb_strtolower($code, 'UTF-8');
```

`reference_group_id` становится `null`, если значение не передано или пустое.

`is_required` и `is_filterable` считаются включёнными, если значение входит в список:

```php
[1, '1', true, 'true', 'on', 'yes']
```

Новая характеристика создаётся активной:

```txt
is_active = 1
```

## Валидация

| Поле | Условие | Ошибка |
|---|---|---|
| `category_id` | Не передан или меньше/равен нулю | `Выберите категорию` |
| `title` | Пустой | `Введите название характеристики` |
| `title` | Длиннее 255 символов | `Название характеристики не должно быть длиннее 255 символов` |
| `code` | Пустой | `Введите ключ характеристики` |
| `code` | Не соответствует `^[a-z0-9_-]+$` | `Ключ может содержать только латинские буквы, цифры, дефис и подчёркивание` |
| `code` | Длиннее 100 символов | `Ключ характеристики не должен быть длиннее 100 символов` |
| `field_type` | Не входит в allowed list | `Выберите корректный тип поля` |
| `sort_order` | Меньше 0 | `Порядок сортировки не может быть отрицательным` |

## Success response

Код ответа: `201`.

```json
{
  "success": true,
  "message": "Характеристика создана",
  "attribute_id": 10
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
    "title": "Введите название характеристики",
    "code": "Введите ключ характеристики",
    "field_type": "Выберите корректный тип поля"
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
  "message": "Нельзя добавить характеристику в отключённую категорию"
}
```

### 404 — справочник не найден или отключён

```json
{
  "success": false,
  "message": "Справочник для характеристики не найден или отключён"
}
```

### 409 — характеристика с таким ключом уже существует

```json
{
  "success": false,
  "message": "Характеристика с таким ключом уже существует в этой категории"
}
```

### 401 / 403 — нет доступа

Формируется в `requireAdmin()`.

Точный формат зависит от реализации `api/admin/shared/require-admin.php`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось создать характеристику",
  "error": "..."
}
```

## Frontend notes

- Используется для создания характеристики в админке.
- Перед созданием нужно выбрать активную категорию.
- Для `field_type = select` обычно нужен `reference_group_id`.
- Backend не требует `reference_group_id` строго для `select`, но frontend лучше валидировать это отдельно.
- `code` должен быть уникален внутри категории.
- После успешного создания нужно обновить список через `index.php`.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdmin()`.
- Использует `moderator-log.php`.
- Работает внутри транзакции.
- При ошибке транзакция откатывается.
- Проверяет категорию и справочник.
- Проверяет уникальность `code` внутри категории.
- Обрабатывает duplicate key `PDOException` с кодом `1062`.
- Логирует действие `create_attribute` для сущности `attribute`.

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
$fieldType = trim((string) ($input['field_type'] ?? ''));
$referenceGroupId = !empty($input['reference_group_id'])
    ? (int) $input['reference_group_id']
    : null;
$isRequired = in_array($input['is_required'] ?? 0, [1, '1', true, 'true', 'on', 'yes'], true) ? 1 : 0;
$isFilterable = in_array($input['is_filterable'] ?? 0, [1, '1', true, 'true', 'on', 'yes'], true) ? 1 : 0;
$sortOrder = (int) ($input['sort_order'] ?? 0);

$code = mb_strtolower($code, 'UTF-8');

$allowedFieldTypes = ['text', 'textarea', 'number', 'boolean', 'select'];
$errors = [];

if ($categoryId <= 0) {
    $errors['category_id'] = 'Выберите категорию';
}

if ($title === '') {
    $errors['title'] = 'Введите название характеристики';
} elseif (mb_strlen($title, 'UTF-8') > 255) {
    $errors['title'] = 'Название характеристики не должно быть длиннее 255 символов';
}

if ($code === '') {
    $errors['code'] = 'Введите ключ характеристики';
} elseif (!preg_match('/^[a-z0-9_-]+$/', $code)) {
    $errors['code'] = 'Ключ может содержать только латинские буквы, цифры, дефис и подчёркивание';
} elseif (mb_strlen($code, 'UTF-8') > 100) {
    $errors['code'] = 'Ключ характеристики не должен быть длиннее 100 символов';
}

if (!in_array($fieldType, $allowedFieldTypes, true)) {
    $errors['field_type'] = 'Выберите корректный тип поля';
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
        errorResponse('Нельзя добавить характеристику в отключённую категорию', 422);
    }

    if ($referenceGroupId !== null) {
        $referenceGroupStmt = $pdo->prepare("
            SELECT id
            FROM reference_groups
            WHERE id = :id
            AND is_active = 1
            LIMIT 1
        ");

        $referenceGroupStmt->execute([
            'id' => $referenceGroupId,
        ]);

        if (!$referenceGroupStmt->fetch()) {
            $pdo->rollBack();
            errorResponse('Справочник для характеристики не найден или отключён', 404);
        }
    }

    $existsStmt = $pdo->prepare("
        SELECT id
        FROM attribute_definitions
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
        errorResponse('Характеристика с таким ключом уже существует в этой категории', 409);
    }

    $stmt = $pdo->prepare("
        INSERT INTO attribute_definitions (
            category_id,
            code,
            title,
            field_type,
            reference_group_id,
            is_required,
            is_filterable,
            sort_order,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            :category_id,
            :code,
            :title,
            :field_type,
            :reference_group_id,
            :is_required,
            :is_filterable,
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
        'field_type' => $fieldType,
        'reference_group_id' => $referenceGroupId,
        'is_required' => $isRequired,
        'is_filterable' => $isFilterable,
        'sort_order' => $sortOrder,
    ]);

    $attributeId = (int) $pdo->lastInsertId();

    writeModeratorLog(
        (int) $adminUser['id'],
        'create_attribute',
        'attribute',
        $attributeId,
        'Создана характеристика: ' . $title . ' (' . $code . ')',
        $pdo
    );

    $pdo->commit();

    successResponse([
        'message' => 'Характеристика создана',
        'attribute_id' => $attributeId,
    ], 201);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    if ($e instanceof PDOException && ($e->errorInfo[1] ?? null) === 1062) {
        errorResponse('Характеристика с таким ключом уже существует в этой категории', 409);
    }

    errorResponse('Не удалось создать характеристику', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-05 | Файл оформлен по коду с хоста и перенесён в структуру `docs/backend/admin/attributes`. |