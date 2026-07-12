# api/admin/dictionaries/delete-value.php

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

Удаляет значение справочника из таблицы `reference_values`.

Endpoint:

1. проверяет JSON;
2. проверяет наличие ID значения;
3. находит значение и его справочник;
4. удаляет значение;
5. пишет действие в лог модератора;
6. возвращает ID удалённого значения.

## Метод и URL

```http
POST /api/admin/dictionaries/delete-value.php
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
  "id": 10
}
```

### Поля

| Поле | Тип | Обязательное | Описание |
|---|---:|---:|---|
| `id` | number | да | ID значения справочника |

## Success response

```json
{
  "success": true,
  "message": "Значение справочника удалено",
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

### 422 — не передан ID значения

```json
{
  "success": false,
  "message": "Не передан ID значения"
}
```

### 404 — значение не найдено

```json
{
  "success": false,
  "message": "Значение справочника не найдено"
}
```

### 401 / 403 — нет доступа

Формируется в `requireAdmin()`.

Точный формат зависит от реализации `api/admin/shared/require-admin.php`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось удалить значение справочника",
  "error": "..."
}
```

## Frontend notes

- Используется в админке для удаления значения справочника.
- Перед удалением желательно показать подтверждение.
- После успешного удаления нужно обновить список справочников через `index.php`.
- Endpoint физически удаляет запись, а не выключает её через `is_active`.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdmin()`.
- Использует `moderator-log.php`.
- Удаление выполняется внутри транзакции.
- При ошибке транзакция откатывается.
- Перед удалением endpoint получает `group_title`, чтобы записать понятное сообщение в лог.
- После удаления пишется лог действия `delete_reference_value`.
- В коде нет проверки, используется ли это значение в связанных таблицах. Если есть внешние ключи или зависимости, это может привести к ошибке удаления на уровне БД.

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

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Файл перенесён в новую структуру документации `docs/backend/admin/dictionaries`. |