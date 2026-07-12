# api/admin/places/reject.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Places |
| Тип | PHP endpoint |
| Авторизация | Требуется admin/moderator session |
| Middleware | `requireAdminOrModerator()` |
| Логирование | `writeModeratorLog()` |
| Источник | Код с хоста `api/admin/places/reject.php` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Отклоняет объявление при модерации.

Endpoint меняет статус объявления на:

```txt
rejected
```

Также устанавливает:

```txt
moderated_at = NOW()
closed_at = NOW()
updated_at = NOW()
```

Причина отклонения не сохраняется отдельным полем в `places`, но записывается в лог модерации.

## Метод и URL

```http
POST /api/admin/places/reject.php
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
  "id": 123,
  "comment": "Не заполнено описание"
}
```

### Поля

| Поле | Тип | Обязательное | Описание |
|---|---:|---:|---|
| `id` | number | да | ID объявления |
| `comment` | string | да | Причина отклонения |

## Валидация

| Поле | Условие | Ошибка |
|---|---|---|
| `id` | Не передан или меньше/равен нулю | `Не передан ID объявления` |
| `comment` | Пустой | `Укажите причину отклонения объявления` |
| `comment` | Длиннее 1000 символов | `Комментарий модератора слишком длинный` |

## Success response

```json
{
  "success": true,
  "message": "Объявление отклонено",
  "place_id": 123,
  "status": "rejected"
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

### 422 — не указана причина

```json
{
  "success": false,
  "message": "Укажите причину отклонения объявления"
}
```

### 422 — слишком длинный комментарий

```json
{
  "success": false,
  "message": "Комментарий модератора слишком длинный"
}
```

### 404 — объявление не найдено

```json
{
  "success": false,
  "message": "Объявление не найдено"
}
```

### 422 — объявление уже отклонено

```json
{
  "success": false,
  "message": "Объявление уже отклонено"
}
```

### 422 — архивное объявление

```json
{
  "success": false,
  "message": "Нельзя отклонить архивное объявление"
}
```

### 401 / 403 — нет доступа

Формируется в `requireAdminOrModerator()`.

Точный формат зависит от реализации `api/admin/shared/require-admin.php`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось отклонить объявление",
  "error": "..."
}
```

## Frontend notes

- Используется для модерации объявления.
- Причина отклонения обязательна.
- Максимальная длина комментария — 1000 символов.
- После успешного ответа статус объявления должен стать `rejected`.
- Комментарий отклонения в текущем коде сохраняется только в moderator-log, не отдельным полем объявления.
- Если на frontend нужна история причин отклонения, её нужно брать из логов модерации, если такой интерфейс реализован.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdminOrModerator()`.
- Использует `moderator-log.php`.
- Работает внутри транзакции.
- При ошибке транзакция откатывается.
- Проверяет:
  - существование объявления;
  - что оно ещё не `rejected`;
  - что оно не `expired`.
- Логирует действие `reject` для сущности `place`.

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
$comment = trim((string) ($input['comment'] ?? ''));

if ($placeId <= 0) {
    errorResponse('Не передан ID объявления', 422);
}

if ($comment === '') {
    errorResponse('Укажите причину отклонения объявления', 422);
}

if (mb_strlen($comment, 'UTF-8') > 1000) {
    errorResponse('Комментарий модератора слишком длинный', 422);
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

    if ($place['status'] === 'rejected') {
        $pdo->rollBack();
        errorResponse('Объявление уже отклонено', 422);
    }

    if ($place['status'] === 'expired') {
        $pdo->rollBack();
        errorResponse('Нельзя отклонить архивное объявление', 422);
    }

    $updateStmt = $pdo->prepare("
        UPDATE places
        SET
            status = 'rejected',
            moderated_at = NOW(),
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
        'reject',
        'place',
        $placeId,
        'Отклонено объявление: ' . ($place['title'] ?? ('#' . $placeId)) . '. Причина: ' . $comment,
        $pdo
    );

    $pdo->commit();

    successResponse([
        'message' => 'Объявление отклонено',
        'place_id' => $placeId,
        'status' => 'rejected',
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось отклонить объявление', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Файл оформлен по коду с хоста и перенесён в структуру `docs/backend/admin/places`. |