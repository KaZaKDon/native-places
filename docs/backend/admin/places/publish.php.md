# api/admin/places/publish.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Places |
| Тип | PHP endpoint |
| Авторизация | Требуется admin/moderator session |
| Middleware | `requireAdminOrModerator()` |
| Логирование | `writeModeratorLog()` |
| Источник | Код с хоста `api/admin/places/publish.php` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Публикует объявление.

Endpoint меняет статус объявления на:

```txt
published
```

Также обновляет даты:

```txt
published_at = COALESCE(published_at, NOW())
moderated_at = NOW()
closed_at = NULL
updated_at = NOW()
```

И пишет действие в лог модерации.

## Метод и URL

```http
POST /api/admin/places/publish.php
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
  "message": "Объявление опубликовано",
  "place_id": 123,
  "status": "published"
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

### 422 — объявление уже опубликовано

```json
{
  "success": false,
  "message": "Объявление уже опубликовано"
}
```

### 422 — архивное объявление

```json
{
  "success": false,
  "message": "Нельзя опубликовать архивное объявление"
}
```

### 422 — неоплаченное объявление

```json
{
  "success": false,
  "message": "Нельзя опубликовать неоплаченное объявление"
}
```

### 401 / 403 — нет доступа

Формируется в `requireAdminOrModerator()`.

Точный формат зависит от реализации `api/admin/shared/require-admin.php`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось опубликовать объявление",
  "error": "..."
}
```

## Frontend notes

- Используется для модерации объявления.
- Кнопку публикации лучше не показывать, если:
  - объявление уже `published`;
  - объявление `expired`;
  - `payment_status = unpaid`.
- После успешной публикации статус в UI должен стать `published`.
- После действия нужно обновить список или карточку объявления.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdminOrModerator()`.
- Использует `moderator-log.php`.
- Работает внутри транзакции.
- При ошибке транзакция откатывается.
- Проверяет:
  - существование объявления;
  - что оно ещё не опубликовано;
  - что оно не архивное;
  - что оно не неоплаченное.
- `published_at` сохраняет старое значение, если объявление уже публиковалось ранее.
- Логирует действие `publish` для сущности `place`.

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
            status,
            payment_status
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

    if ($place['status'] === 'published') {
        $pdo->rollBack();
        errorResponse('Объявление уже опубликовано', 422);
    }

    if ($place['status'] === 'expired') {
        $pdo->rollBack();
        errorResponse('Нельзя опубликовать архивное объявление', 422);
    }

    if ($place['payment_status'] === 'unpaid') {
        $pdo->rollBack();
        errorResponse('Нельзя опубликовать неоплаченное объявление', 422);
    }

    $updateStmt = $pdo->prepare("
        UPDATE places
        SET
            status = 'published',
            published_at = COALESCE(published_at, NOW()),
            moderated_at = NOW(),
            closed_at = NULL,
            updated_at = NOW()
        WHERE id = :id
        LIMIT 1
    ");

    $updateStmt->execute([
        'id' => $placeId,
    ]);

    writeModeratorLog(
        (int) $adminUser['id'],
        'publish',
        'place',
        $placeId,
        'Опубликовано объявление: ' . ($place['title'] ?? ('#' . $placeId)),
        $pdo
    );

    $pdo->commit();

    successResponse([
        'message' => 'Объявление опубликовано',
        'place_id' => $placeId,
        'status' => 'published',
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось опубликовать объявление', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Файл оформлен по коду с хоста и перенесён в структуру `docs/backend/admin/places`. |