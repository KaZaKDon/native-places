# api/admin/access-codes/disable.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Access Codes |
| Тип | PHP endpoint |
| Авторизация | Требуется admin session |
| Middleware | `requireAdmin()` |
| Источник | Код с хоста `api/admin/access-codes/disable.php` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Отключает код доступа модератора.

Endpoint меняет статус кода доступа на:

```txt
disabled
```

## Метод и URL

```http
POST /api/admin/access-codes/disable.php
```

## Авторизация

Требуется административная сессия.

Проверка выполняется через:

```php
requireAdmin();
```

Endpoint доступен именно администратору.

## Request

### Body

```json
{
  "id": 1
}
```

### Поля

| Поле | Тип | Обязательное | Описание |
|---|---:|---:|---|
| `id` | number | да | ID кода доступа |

## Success response

```json
{
  "success": true,
  "message": "Код доступа отключён",
  "id": 1,
  "status": "disabled"
}
```

## Error responses

### 422 — не указан ID кода доступа

```json
{
  "success": false,
  "message": "Не указан ID кода доступа"
}
```

### 404 — код доступа не найден

```json
{
  "success": false,
  "message": "Код доступа не найден"
}
```

### 422 — код уже отключён

```json
{
  "success": false,
  "message": "Код доступа уже отключён"
}
```

### 401 / 403 — нет доступа

Формируется в `requireAdmin()`.

Точный формат зависит от реализации `api/admin/shared/require-admin.php`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось отключить код доступа",
  "error": "..."
}
```

## Frontend notes

- Используется для отключения кода доступа.
- После успешного ответа нужно обновить список через `index.php`.
- Если код уже отключён, backend вернёт 422.
- Отключение не удаляет запись из базы, а только меняет статус.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdmin()`.
- Подключение к базе фактически приходит через `require-admin.php`.
- Проверяет существование кода доступа.
- Запрещает повторно отключать уже отключённый код.
- Endpoint не использует транзакцию.
- Endpoint не пишет moderator-log.

## PHP-код

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdmin();

$input = json_decode(file_get_contents('php://input'), true);

$accessCodeId = (int) ($input['id'] ?? 0);

if ($accessCodeId <= 0) {
    errorResponse('Не указан ID кода доступа', 422);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT id, status
        FROM admin_access_codes
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $accessCodeId,
    ]);

    $accessCode = $stmt->fetch();

    if (!$accessCode) {
        errorResponse('Код доступа не найден', 404);
    }

    if ($accessCode['status'] === 'disabled') {
        errorResponse('Код доступа уже отключён', 422);
    }

    $updateStmt = $pdo->prepare("
        UPDATE admin_access_codes
        SET status = 'disabled'
        WHERE id = :id
        LIMIT 1
    ");

    $updateStmt->execute([
        'id' => $accessCodeId,
    ]);

    successResponse([
        'message' => 'Код доступа отключён',
        'id' => $accessCodeId,
        'status' => 'disabled',
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось отключить код доступа', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-05 | Файл оформлен по коду с хоста и перенесён в структуру `docs/backend/admin/access-codes`. |