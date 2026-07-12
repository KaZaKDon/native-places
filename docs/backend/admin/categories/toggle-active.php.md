# api/admin/categories/toggle-active.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Categories |
| Тип | PHP endpoint |
| Авторизация | Требуется admin session |
| Middleware | `requireAdmin()` |
| Логирование | `writeModeratorLog()` |
| Источник | Код с хоста `api/admin/categories/toggle-active.php` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Включает или отключает категорию.

Endpoint меняет поле:

```txt
categories.is_active
```

Если категория отключается, backend дополнительно проверяет, что в ней нет объявлений.

## Метод и URL

```http
POST /api/admin/categories/toggle-active.php
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
  "is_active": true
}
```

### Поля

| Поле | Тип | Обязательное | Описание |
|---|---:|---:|---|
| `id` | number | да | ID категории |
| `is_active` | mixed | да | Новый статус активности |

## Нормализация `is_active`

Активным считается значение из списка:

```php
[1, '1', true, 'true', 'on', 'yes']
```

В остальных случаях сохраняется `0`.

## Success response

### Категория включена

```json
{
  "success": true,
  "message": "Категория включена",
  "category_id": 1,
  "is_active": 1
}
```

### Категория отключена

```json
{
  "success": true,
  "message": "Категория отключена",
  "category_id": 1,
  "is_active": 0
}
```

## Error responses

### 422 — не передан ID категории

```json
{
  "success": false,
  "message": "Не передан ID категории"
}
```

### 404 — категория не найдена

```json
{
  "success": false,
  "message": "Категория не найдена"
}
```

### 422 — нельзя отключить категорию с объявлениями

```json
{
  "success": false,
  "message": "Нельзя отключить категорию, в которой есть объявления",
  "places_count": 25
}
```

### 401 / 403 — нет доступа

Формируется в `requireAdmin()`.

Точный формат зависит от реализации `api/admin/shared/require-admin.php`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось изменить статус категории",
  "error": "..."
}
```

## Frontend notes

- Используется для включения/отключения категории.
- Если категория содержит объявления, отключить её нельзя.
- Если backend вернул `places_count`, можно показать пользователю количество объявлений, мешающих отключению.
- После успешного изменения нужно обновить список через `index.php`.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdmin()`.
- Использует `moderator-log.php`.
- Работает внутри транзакции.
- При ошибке транзакция откатывается.
- Перед отключением проверяет количество объявлений в категории.
- Логирует:
  - `enable_category`;
  - `disable_category`.

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

$isActiveRaw = $input['is_active'] ?? 0;
$isActive = in_array($isActiveRaw, [1, '1', true, 'true', 'on', 'yes'], true) ? 1 : 0;

if ($categoryId <= 0) {
    errorResponse('Не передан ID категории', 422);
}

try {
    $pdo = getDatabaseConnection();

    $pdo->beginTransaction();

    $stmt = $pdo->prepare("
        SELECT
            id,
            title,
            code,
            is_active
        FROM categories
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $categoryId,
    ]);

    $category = $stmt->fetch();

    if (!$category) {
        $pdo->rollBack();
        errorResponse('Категория не найдена', 404);
    }

    if ($isActive === 0) {
        $placesStmt = $pdo->prepare("
            SELECT COUNT(*) AS total
            FROM places
            WHERE category_id = :category_id
        ");

        $placesStmt->execute([
            'category_id' => $categoryId,
        ]);

        $placesCount = (int) ($placesStmt->fetch()['total'] ?? 0);

        if ($placesCount > 0) {
            $pdo->rollBack();
            errorResponse('Нельзя отключить категорию, в которой есть объявления', 422, [
                'places_count' => $placesCount,
            ]);
        }
    }

    $updateStmt = $pdo->prepare("
        UPDATE categories
        SET
            is_active = :is_active,
            updated_at = NOW()
        WHERE id = :id
        LIMIT 1
    ");

    $updateStmt->execute([
        'id' => $categoryId,
        'is_active' => $isActive,
    ]);

    writeModeratorLog(
        (int) $adminUser['id'],
        $isActive ? 'enable_category' : 'disable_category',
        'category',
        $categoryId,
        ($isActive ? 'Включена категория: ' : 'Отключена категория: ') . ($category['title'] ?? ('#' . $categoryId)),
        $pdo
    );

    $pdo->commit();

    successResponse([
        'message' => $isActive ? 'Категория включена' : 'Категория отключена',
        'category_id' => $categoryId,
        'is_active' => $isActive,
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось изменить статус категории', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-05 | Файл оформлен по коду с хоста и перенесён в структуру `docs/backend/admin/categories`. |