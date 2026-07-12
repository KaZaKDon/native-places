# api/admin/reports/close.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Reports |
| Тип | PHP endpoint |
| Авторизация | Требуется admin/moderator session |
| Middleware | `requireAdminOrModerator()` |
| Логирование | `writeModeratorLog()` |
| Источник | Код с хоста `api/admin/reports/close.php` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Закрывает жалобу как решённую.

Endpoint меняет статус жалобы на:

```txt
resolved
```

Также устанавливает:

```txt
resolved_at = NOW()
updated_at = NOW()
```

И пишет действие в лог модерации.

## Метод и URL

```http
POST /api/admin/reports/close.php
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
  "id": 12
}
```

### Поля

| Поле | Тип | Обязательное | Описание |
|---|---:|---:|---|
| `id` | number | да | ID жалобы |

## Success response

```json
{
  "success": true,
  "message": "Жалоба закрыта",
  "report_id": 12,
  "status": "resolved"
}
```

## Error responses

### 422 — не передан ID жалобы

```json
{
  "success": false,
  "message": "Не передан ID жалобы"
}
```

### 404 — жалоба не найдена

```json
{
  "success": false,
  "message": "Жалоба не найдена"
}
```

### 422 — жалоба уже решена

```json
{
  "success": false,
  "message": "Жалоба уже решена"
}
```

### 422 — отклонённую жалобу нельзя закрыть

```json
{
  "success": false,
  "message": "Отклонённую жалобу нельзя закрыть как решённую"
}
```

### 401 / 403 — нет доступа

Формируется в `requireAdminOrModerator()`.

Точный формат зависит от реализации `api/admin/shared/require-admin.php`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось закрыть жалобу",
  "error": "..."
}
```

## Frontend notes

- Используется в админке для закрытия жалобы.
- Кнопку закрытия лучше не показывать, если жалоба уже:
  - `resolved`;
  - `rejected`.
- После успешного ответа нужно обновить список или карточку жалобы.
- В UI это действие можно назвать:
  - “Закрыть жалобу”;
  - “Отметить как решённую”.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdminOrModerator()`.
- Использует `moderator-log.php`.
- Работает внутри транзакции.
- При ошибке транзакция откатывается.
- Проверяет существование жалобы.
- Запрещает закрывать уже решённую жалобу.
- Запрещает закрывать отклонённую жалобу как решённую.
- Логирует действие `resolve_report` для сущности `report`.

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

$reportId = (int) ($input['id'] ?? 0);

if ($reportId <= 0) {
    errorResponse('Не передан ID жалобы', 422);
}

try {
    $pdo = getDatabaseConnection();

    $pdo->beginTransaction();

    $stmt = $pdo->prepare("
        SELECT
            id,
            place_id,
            user_id,
            report_type,
            status
        FROM reports
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $reportId,
    ]);

    $report = $stmt->fetch();

    if (!$report) {
        $pdo->rollBack();
        errorResponse('Жалоба не найдена', 404);
    }

    if ($report['status'] === 'resolved') {
        $pdo->rollBack();
        errorResponse('Жалоба уже решена', 422);
    }

    if ($report['status'] === 'rejected') {
        $pdo->rollBack();
        errorResponse('Отклонённую жалобу нельзя закрыть как решённую', 422);
    }

    $updateStmt = $pdo->prepare("
        UPDATE reports
        SET
            status = 'resolved',
            resolved_at = NOW(),
            updated_at = NOW()
        WHERE id = :id
        LIMIT 1
    ");

    $updateStmt->execute([
        'id' => $reportId,
    ]);

    writeModeratorLog(
        (int) $adminUser['id'],
        'resolve_report',
        'report',
        $reportId,
        'Жалоба решена: #' . $reportId . ', тип: ' . ($report['report_type'] ?? '—'),
        $pdo
    );

    $pdo->commit();

    successResponse([
        'message' => 'Жалоба закрыта',
        'report_id' => $reportId,
        'status' => 'resolved',
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось закрыть жалобу', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Файл оформлен по коду с хоста и перенесён в структуру `docs/backend/admin/reports`. |