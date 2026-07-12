# api/admin/categories/update.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Categories |
| Тип | PHP endpoint |
| Авторизация | Требуется admin session |
| Middleware | `requireAdmin()` |
| Логирование | `writeModeratorLog()` |
| Источник | Код с хоста `api/admin/categories/update.php` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Обновляет категорию объявлений.

Endpoint:

1. принимает ID категории;
2. валидирует название, код, иконку, цвет и порядок сортировки;
3. проверяет существование категории;
4. проверяет уникальность `code` среди других категорий;
5. обновляет запись в таблице `categories`;
6. пишет действие в лог модерации;
7. возвращает ID обновлённой категории.

## Метод и URL

```http
POST /api/admin/categories/update.php
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
  "id": 1,
  "title": "Еда",
  "code": "food",
  "description": "Кафе, рестораны и гастрономия",
  "icon": "utensils",
  "color": "#FFAA00",
  "sort_order": 10
}
```

### Поля

| Поле | Тип | Обязательное | Описание |
|---|---:|---:|---|
| `id` | number | да | ID категории |
| `title` | string | да | Название категории |
| `code` | string | да | Код категории |
| `description` | string | нет | Описание категории |
| `icon` | string | нет | Иконка |
| `color` | string | нет | Цвет |
| `sort_order` | number | нет | Порядок сортировки |

## Нормализация

Код категории приводится к нижнему регистру:

```php
$code = mb_strtolower($code, 'UTF-8');
```

Пустые значения `description`, `icon`, `color` сохраняются как `NULL`.

## Валидация

| Поле | Условие | Ошибка |
|---|---|---|
| `id` | Не передан или меньше/равен нулю | `Не передан ID категории` |
| `title` | Пустой | `Введите название категории` |
| `title` | Длиннее 100 символов | `Название категории не должно быть длиннее 100 символов` |
| `code` | Пустой | `Введите код категории` |
| `code` | Не соответствует `^[a-z0-9_-]+$` | `Код может содержать только латинские буквы, цифры, дефис и подчёркивание` |
| `code` | Длиннее 50 символов | `Код категории не должен быть длиннее 50 символов` |
| `icon` | Длиннее 50 символов | `Иконка не должна быть длиннее 50 символов` |
| `color` | Длиннее 30 символов | `Цвет не должен быть длиннее 30 символов` |
| `sort_order` | Меньше 0 | `Порядок сортировки не может быть отрицательным` |

## Success response

```json
{
  "success": true,
  "message": "Категория обновлена",
  "category_id": 1
}
```

## Error responses

### 422 — ошибка валидации

```json
{
  "success": false,
  "message": "Ошибка валидации",
  "errors": {
    "id": "Не передан ID категории",
    "title": "Введите название категории",
    "code": "Введите код категории"
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

### 409 — категория с таким кодом уже существует

```json
{
  "success": false,
  "message": "Категория с таким кодом уже существует"
}
```

### 401 / 403 — нет доступа

Формируется в `requireAdmin()`.

Точный формат зависит от реализации `api/admin/shared/require-admin.php`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось обновить категорию",
  "error": "..."
}
```

## Frontend notes

- Используется для редактирования категории в админке.
- `code` можно менять, но нужно учитывать, что он может использоваться во frontend-роутинге, фильтрах или публичном API.
- После успешного обновления нужно обновить список через `index.php`.
- Активность категории этим endpoint-ом не меняется. Для этого есть `toggle-active.php`.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdmin()`.
- Использует `moderator-log.php`.
- Работает внутри транзакции.
- При ошибке транзакция откатывается.
- Проверяет существование категории.
- Проверяет уникальность `code`, исключая текущий `id`.
- Обрабатывает duplicate key `PDOException` с кодом `1062`.
- Логирует действие `update_category` для сущности `category`.

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

$categoryId = (int) ($input['id'] ?? 0);
$title = trim((string) ($input['title'] ?? ''));
$code = trim((string) ($input['code'] ?? ''));
$description = trim((string) ($input['description'] ?? ''));
$icon = trim((string) ($input['icon'] ?? ''));
$color = trim((string) ($input['color'] ?? ''));
$sortOrder = (int) ($input['sort_order'] ?? 0);

$code = mb_strtolower($code, 'UTF-8');

$errors = [];

if ($categoryId <= 0) {
    $errors['id'] = 'Не передан ID категории';
}

if ($title === '') {
    $errors['title'] = 'Введите название категории';
} elseif (mb_strlen($title, 'UTF-8') > 100) {
    $errors['title'] = 'Название категории не должно быть длиннее 100 символов';
}

if ($code === '') {
    $errors['code'] = 'Введите код категории';
} elseif (!preg_match('/^[a-z0-9_-]+$/', $code)) {
    $errors['code'] = 'Код может содержать только латинские буквы, цифры, дефис и подчёркивание';
} elseif (mb_strlen($code, 'UTF-8') > 50) {
    $errors['code'] = 'Код категории не должен быть длиннее 50 символов';
}

if ($icon !== '' && mb_strlen($icon, 'UTF-8') > 50) {
    $errors['icon'] = 'Иконка не должна быть длиннее 50 символов';
}

if ($color !== '' && mb_strlen($color, 'UTF-8') > 30) {
    $errors['color'] = 'Цвет не должен быть длиннее 30 символов';
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
            code
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

    $existsStmt = $pdo->prepare("
        SELECT id
        FROM categories
        WHERE code = :code
        AND id <> :id
        LIMIT 1
    ");

    $existsStmt->execute([
        'code' => $code,
        'id' => $categoryId,
    ]);

    if ($existsStmt->fetch()) {
        $pdo->rollBack();
        errorResponse('Категория с таким кодом уже существует', 409);
    }

    $stmt = $pdo->prepare("
        UPDATE categories
        SET
            code = :code,
            title = :title,
            description = :description,
            icon = :icon,
            color = :color,
            sort_order = :sort_order,
            updated_at = NOW()
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $categoryId,
        'code' => $code,
        'title' => $title,
        'description' => $description !== '' ? $description : null,
        'icon' => $icon !== '' ? $icon : null,
        'color' => $color !== '' ? $color : null,
        'sort_order' => $sortOrder,
    ]);

    writeModeratorLog(
        (int) $adminUser['id'],
        'update_category',
        'category',
        $categoryId,
        'Обновлена категория: ' . $title . ' (' . $code . ')',
        $pdo
    );

    $pdo->commit();

    successResponse([
        'message' => 'Категория обновлена',
        'category_id' => $categoryId,
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    if ($e instanceof PDOException && ($e->errorInfo[1] ?? null) === 1062) {
        errorResponse('Категория с таким кодом уже существует', 409);
    }

    errorResponse('Не удалось обновить категорию', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-05 | Файл оформлен по коду с хоста и перенесён в структуру `docs/backend/admin/categories`. |