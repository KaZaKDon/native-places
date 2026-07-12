# api/admin/place-types/toggle-active.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Place Types |
| Тип | PHP endpoint |
| Авторизация | Требуется admin session |
| Middleware | `requireAdmin()` |
| Логирование | `writeModeratorLog()` |
| Источник | Код с хоста `api/admin/place-types/toggle-active.php` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Включает или отключает тип объекта.

Endpoint меняет поле:

```txt
place_types.is_active
```

Если тип объекта отключается, backend дополнительно проверяет, что к нему не привязаны объявления.

## Метод и URL

```http
POST /api/admin/place-types/toggle-active.php
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
  "id": 5,
  "is_active": false
}
```

### Поля

| Поле | Тип | Обязательное | Описание |
|---|---:|---:|---|
| `id` | number | да | ID типа объекта |
| `is_active` | mixed | да | Новый статус активности |

## Нормализация `is_active`

Активным считается значение из списка:

```php
[1, '1', true, 'true', 'on', 'yes']
```

В остальных случаях сохраняется `0`.

## Success response

### Тип объекта включён

```json
{
  "success": true,
  "message": "Тип объекта включён",
  "type_id": 5,
  "is_active": 1
}
```

### Тип объекта отключён

```json
{
  "success": true,
  "message": "Тип объекта отключён",
  "type_id": 5,
  "is_active": 0
}
```

## Error responses

### 422 — не передан ID типа объекта

```json
{
  "success": false,
  "message": "Не передан ID типа объекта"
}
```

### 404 — тип объекта не найден

```json
{
  "success": false,
  "message": "Тип объекта не найден"
}
```

### 422 — нельзя отключить тип с объявлениями

```json
{
  "success": false,
  "message": "Нельзя отключить тип объекта, к которому привязаны объявления",
  "places_count": 12
}
```

### 401 / 403 — нет доступа

Формируется в `requireAdmin()`.

Точный формат зависит от реализации `api/admin/shared/require-admin.php`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось изменить статус типа объекта",
  "error": "..."
}
```

## Frontend notes

- Используется для включения/отключения типа объекта.
- Если к типу привязаны объявления, отключить его нельзя.
- Если backend вернул `places_count`, можно показать количество объявлений, мешающих отключению.
- После успешного изменения нужно обновить список через `index.php`.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdmin()`.
- Использует `moderator-log.php`.
- Работает внутри транзакции.
- При ошибке транзакция откатывается.
- Перед отключением проверяет количество объявлений с этим `place_type_id`.
- Логирует:
  - `enable_place_type`;
  - `disable_place_type`.

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

$typeId = (int) ($input['id'] ?? 0);

$isActiveRaw = $input['is_active'] ?? 0;
$isActive = in_array($isActiveRaw, [1, '1', true, 'true', 'on', 'yes'], true) ? 1 : 0;

if ($typeId <= 0) {
    errorResponse('Не передан ID типа объекта', 422);
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
        FROM place_types
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $typeId,
    ]);

    $type = $stmt->fetch();

    if (!$type) {
        $pdo->rollBack();
        errorResponse('Тип объекта не найден', 404);
    }

    if ($isActive === 0) {
        $placesStmt = $pdo->prepare("
            SELECT COUNT(*) AS total
            FROM places
            WHERE place_type_id = :place_type_id
        ");

        $placesStmt->execute([
            'place_type_id' => $typeId,
        ]);

        $placesCount = (int) ($placesStmt->fetch()['total'] ?? 0);

        if ($placesCount > 0) {
            $pdo->rollBack();
            errorResponse('Нельзя отключить тип объекта, к которому привязаны объявления', 422, [
                'places_count' => $placesCount,
            ]);
        }
    }

    $updateStmt = $pdo->prepare("
        UPDATE place_types
        SET
            is_active = :is_active,
            updated_at = NOW()
        WHERE id = :id
        LIMIT 1
    ");

    $updateStmt->execute([
        'id' => $typeId,
        'is_active' => $isActive,
    ]);

    writeModeratorLog(
        (int) $adminUser['id'],
        $isActive ? 'enable_place_type' : 'disable_place_type',
        'place_type',
        $typeId,
        ($isActive ? 'Включён тип объекта: ' : 'Отключён тип объекта: ') . ($type['title'] ?? ('#' . $typeId)),
        $pdo
    );

    $pdo->commit();

    successResponse([
        'message' => $isActive ? 'Тип объекта включён' : 'Тип объекта отключён',
        'type_id' => $typeId,
        'is_active' => $isActive,
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось изменить статус типа объекта', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-05 | Файл оформлен по коду с хоста и перенесён в структуру `docs/backend/admin/place-types`. |