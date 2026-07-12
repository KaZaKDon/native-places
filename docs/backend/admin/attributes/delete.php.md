# api/admin/attributes/delete.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Attributes |
| Тип | PHP endpoint |
| Авторизация | Требуется admin session |
| Middleware | `requireAdmin()` |
| Логирование | `writeModeratorLog()` |
| Источник | Код с хоста `api/admin/attributes/delete.php` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Удаляет характеристику.

Endpoint физически удаляет запись из таблицы `attribute_definitions`, но только если характеристика ещё не используется в объявлениях.

Перед удалением проверяется таблица:

```txt
place_attributes
```

Если есть связанные значения, удаление запрещается.

## Метод и URL

```http
POST /api/admin/attributes/delete.php
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
  "id": 10
}
```

### Поля

| Поле | Тип | Обязательное | Описание |
|---|---:|---:|---|
| `id` | number | да | ID характеристики |

## Success response

```json
{
  "success": true,
  "message": "Характеристика удалена",
  "attribute_id": 10
}
```

## Error responses

### 422 — не передан ID характеристики

```json
{
  "success": false,
  "message": "Не передан ID характеристики"
}
```

### 404 — характеристика не найдена

```json
{
  "success": false,
  "message": "Характеристика не найдена"
}
```

### 422 — характеристика используется в объявлениях

```json
{
  "success": false,
  "message": "Нельзя удалить характеристику, которая уже используется в объявлениях",
  "places_count": 12
}
```

Важно: поле называется `places_count`, но фактически в коде это количество записей в `place_attributes`, то есть количество значений характеристики.

### 401 / 403 — нет доступа

Формируется в `requireAdmin()`.

Точный формат зависит от реализации `api/admin/shared/require-admin.php`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось удалить характеристику",
  "error": "..."
}
```

## Frontend notes

- Используется для удаления характеристики.
- Перед удалением желательно показывать подтверждение.
- Если характеристика уже используется в объявлениях, удалить её нельзя.
- После успешного удаления нужно обновить список через `index.php`.
- Endpoint физически удаляет запись, а не выключает её через `is_active`.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdmin()`.
- Использует `moderator-log.php`.
- Работает внутри транзакции.
- При ошибке транзакция откатывается.
- Проверяет существование характеристики.
- Проверяет наличие связанных записей в `place_attributes`.
- Логирует действие `delete_attribute` для сущности `attribute`.

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

$attributeId = (int) ($input['id'] ?? 0);

if ($attributeId <= 0) {
    errorResponse('Не передан ID характеристики', 422);
}

try {
    $pdo = getDatabaseConnection();

    $pdo->beginTransaction();

    $stmt = $pdo->prepare("
        SELECT
            id,
            title,
            code
        FROM attribute_definitions
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $attributeId,
    ]);

    $attribute = $stmt->fetch();

    if (!$attribute) {
        $pdo->rollBack();
        errorResponse('Характеристика не найдена', 404);
    }

    $valuesStmt = $pdo->prepare("
        SELECT COUNT(*) AS total
        FROM place_attributes
        WHERE attribute_definition_id = :attribute_definition_id
    ");

    $valuesStmt->execute([
        'attribute_definition_id' => $attributeId,
    ]);

    $valuesCount = (int) ($valuesStmt->fetch()['total'] ?? 0);

    if ($valuesCount > 0) {
        $pdo->rollBack();
        errorResponse('Нельзя удалить характеристику, которая уже используется в объявлениях', 422, [
            'places_count' => $valuesCount,
        ]);
    }

    $deleteStmt = $pdo->prepare("
        DELETE FROM attribute_definitions
        WHERE id = :id
        LIMIT 1
    ");

    $deleteStmt->execute([
        'id' => $attributeId,
    ]);

    writeModeratorLog(
        (int) $adminUser['id'],
        'delete_attribute',
        'attribute',
        $attributeId,
        'Удалена характеристика: ' . ($attribute['title'] ?? ('#' . $attributeId)),
        $pdo
    );

    $pdo->commit();

    successResponse([
        'message' => 'Характеристика удалена',
        'attribute_id' => $attributeId,
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось удалить характеристику', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-05 | Файл оформлен по коду с хоста и перенесён в структуру `docs/backend/admin/attributes`. |