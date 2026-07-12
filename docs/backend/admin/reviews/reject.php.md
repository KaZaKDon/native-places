# api/admin/reviews/reject.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Reviews |
| Тип | PHP endpoint |
| Авторизация | Требуется admin/moderator session |
| Middleware | `requireAdminOrModerator()` |
| Логирование | `writeModeratorLog()` |
| Источник | Код с хоста `api/admin/reviews/reject.php` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Отклоняет отзыв при модерации.

Endpoint меняет статус отзыва на:

```txt
rejected
```

Также устанавливает:

```txt
moderated_at = NOW()
updated_at = NOW()
```

И пишет действие в лог модерации.

## Метод и URL

```http
POST /api/admin/reviews/reject.php
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
  "id": 10
}
```

### Поля

| Поле | Тип | Обязательное | Описание |
|---|---:|---:|---|
| `id` | number | да | ID отзыва |

## Success response

```json
{
  "success": true,
  "message": "Отзыв отклонён",
  "review_id": 10,
  "status": "rejected"
}
```

## Error responses

### 422 — не передан ID отзыва

```json
{
  "success": false,
  "message": "Не передан ID отзыва"
}
```

### 404 — отзыв не найден

```json
{
  "success": false,
  "message": "Отзыв не найден"
}
```

### 422 — отзыв уже отклонён

```json
{
  "success": false,
  "message": "Отзыв уже отклонён"
}
```

### 401 / 403 — нет доступа

Формируется в `requireAdminOrModerator()`.

Точный формат зависит от реализации `api/admin/shared/require-admin.php`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось отклонить отзыв",
  "error": "..."
}
```

## Frontend notes

- Используется для модерации отзывов.
- Кнопку отклонения лучше не показывать, если отзыв уже `rejected`.
- После успешного ответа нужно обновить список или карточку отзыва.
- После отклонения статус в UI должен стать `rejected`.
- В текущем коде причина отклонения не передаётся и не сохраняется.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdminOrModerator()`.
- Использует `moderator-log.php`.
- Работает внутри транзакции.
- При ошибке транзакция откатывается.
- Проверяет существование отзыва.
- Запрещает повторно отклонять уже отклонённый отзыв.
- Логирует действие `reject_review` для сущности `review`.

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

$reviewId = (int) ($input['id'] ?? 0);

if ($reviewId <= 0) {
    errorResponse('Не передан ID отзыва', 422);
}

try {
    $pdo = getDatabaseConnection();

    $pdo->beginTransaction();

    $stmt = $pdo->prepare("
        SELECT
            id,
            place_id,
            user_id,
            status
        FROM reviews
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $reviewId,
    ]);

    $review = $stmt->fetch();

    if (!$review) {
        $pdo->rollBack();
        errorResponse('Отзыв не найден', 404);
    }

    if ($review['status'] === 'rejected') {
        $pdo->rollBack();
        errorResponse('Отзыв уже отклонён', 422);
    }

    $updateStmt = $pdo->prepare("
        UPDATE reviews
        SET
            status = 'rejected',
            moderated_at = NOW(),
            updated_at = NOW()
        WHERE id = :id
        LIMIT 1
    ");

    $updateStmt->execute([
        'id' => $reviewId,
    ]);

    writeModeratorLog(
        (int) $adminUser['id'],
        'reject_review',
        'review',
        $reviewId,
        'Отклонён отзыв #' . $reviewId . ' к объявлению #' . (int) $review['place_id'],
        $pdo
    );

    $pdo->commit();

    successResponse([
        'message' => 'Отзыв отклонён',
        'review_id' => $reviewId,
        'status' => 'rejected',
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось отклонить отзыв', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-05 | Файл оформлен по коду с хоста и перенесён в структуру `docs/backend/admin/reviews`. |