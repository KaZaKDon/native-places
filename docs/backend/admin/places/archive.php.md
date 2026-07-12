# api/admin/places/archive.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Places |
| Тип | PHP endpoint |
| Авторизация | Требуется admin/moderator session |
| Middleware | `requireAdminOrModerator()` |
| Логирование | `writeModeratorLog()` |
| Источник | Код с хоста `api/admin/places/archive.php` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Перемещает объявление в архив.

Технически endpoint меняет статус объявления на:

```txt
expired
```

Также устанавливает:

```txt
closed_at = NOW()
updated_at = NOW()
```

И пишет действие в лог модерации.

## Метод и URL

```http
POST /api/admin/places/archive.php
```

## Авторизация

Требуется административная или модераторская сессия.

Проверка выполняется через:

```php
$adminUser = requireAdminOrModerator();
```

Endpoint доступен администратору и модератору.

## Request

### Body

```json
{
  "id": 123
}
```

### Поля

| Поле | Тип | Обязательное | Описание |
|---|---:|---:|---|
| `id` | number | да | ID объявления |

## Success response

```json
{
  "success": true,
  "message": "Объявление перемещено в архив",
  "place_id": 123,
  "status": "expired"
}
```

## Error responses

### 422 — не передан ID объявления

```json
{
  "success": false,
  "message": "Не передан ID объявления"
}
```

### 404 — объявление не найдено

```json
{
  "success": false,
  "message": "Объявление не найдено"
}
```

### 422 — объявление уже в архиве

```json
{
  "success": false,
  "message": "Объявление уже в архиве"
}
```

### 401 / 403 — нет доступа

Формируется в `requireAdminOrModerator()`.

Точный формат зависит от реализации `api/admin/shared/require-admin.php`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось переместить объявление в архив",
  "error": "..."
}
```

## Frontend notes

- Используется в админке для снятия объявления с публикации.
- После успешного ответа нужно обновить карточку или список объявлений.
- В UI это действие можно назвать:
  - “В архив”;
  - “Снять с публикации”;
  - “Архивировать”.
- Если объявление уже `expired`, backend вернёт ошибку 422.
- После архивации статус в интерфейсе должен стать `expired`.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdminOrModerator()`.
- Использует `moderator-log.php`.
- Работает внутри транзакции.
- При ошибке транзакция откатывается.
- Проверяет существование объявления.
- Не проверяет текущий статус кроме `expired`.
- Логирует действие `archive` для сущности `place`.

## PHP-код

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';
require_once __DIR__ . '/../shared/moderator-log.php';

$adminUser = requireAdminOrModerator();

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    $input = [];
}

$placeId = (int) ($input['id'] ?? 0);

if ($placeId <= 0) {
    errorResponse('Не передан ID объявления', 422);
}

try {
    $pdo = getDatabaseConnection();

    $pdo->beginTransaction();

    $stmt = $pdo->prepare("
        SELECT
            id,
            title,
            status
        FROM places
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $placeId,
    ]);

    $place = $stmt->fetch();

    if (!$place) {
        $pdo->rollBack();
        errorResponse('Объявление не найдено', 404);
    }

    if ($place['status'] === 'expired') {
        $pdo->rollBack();
        errorResponse('Объявление уже в архиве', 422);
    }

    $updateStmt = $pdo->prepare("
        UPDATE places
        SET
            status = 'expired',
            closed_at = NOW(),
            updated_at = NOW()
        WHERE id = :id
        LIMIT 1
    ");

    $updateStmt->execute([
        'id' => $placeId,
    ]);

    writeModeratorLog(
        (int) $adminUser['id'],
        'archive',
        'place',
        $placeId,
        'Объявление снято с публикации: ' . ($place['title'] ?? ('#' . $placeId)),
        $pdo
    );

    $pdo->commit();

    successResponse([
        'message' => 'Объявление перемещено в архив',
        'place_id' => $placeId,
        'status' => 'expired',
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось переместить объявление в архив', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Файл оформлен по коду с хоста и перенесён в структуру `docs/backend/admin/places`. |