# api/admin/mailings/delete.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Mailings |
| Тип | PHP endpoint |
| Авторизация | Требуется admin session |
| Middleware | `requireAdmin()` |
| Источник | Код с хоста `api/admin/mailings/delete.php` |
| Готовность | Актуализировано по коду с хоста |

## Назначение

Удаляет черновик рассылки.

Endpoint разрешает удалять только рассылки со статусом:

```txt
draft
```

Если рассылка уже отправляется, отправлена или завершилась ошибкой — удалить её через этот endpoint нельзя.

## Метод и URL

```http
POST /api/admin/mailings/delete.php
```

## Авторизация

Требуется административная сессия.

Проверка выполняется через:

```php
requireAdmin();
```

Endpoint доступен только администратору.

## Request

### Body

```json
{
  "mailing_id": 1
}
```

### Поля

| Поле | Тип | Обязательное | Описание |
|---|---:|---:|---|
| `mailing_id` | number | да | ID рассылки |

## Success response

```json
{
  "success": true,
  "message": "Черновик удалён"
}
```

## Error responses

### 422 — не указан ID рассылки

```json
{
  "success": false,
  "message": "Не указан идентификатор рассылки"
}
```

### 404 — рассылка не найдена

```json
{
  "success": false,
  "message": "Рассылка не найдена"
}
```

### 422 — удалять можно только черновики

```json
{
  "success": false,
  "message": "Удалять можно только черновики"
}
```

### 401 / 403 — нет доступа

Формируется в `requireAdmin()`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось удалить рассылку",
  "error": "..."
}
```

## Frontend notes

- Кнопку удаления лучше показывать только для статуса `draft`.
- После успешного удаления нужно обновить список рассылок.
- Модератору этот endpoint недоступен.

## Backend notes

- Использует `requireAdmin()`.
- Удаление физическое через `DELETE FROM mailings`.
- Если в базе есть `ON DELETE CASCADE` для `mailing_recipients`, получатели удалятся автоматически.
- Endpoint не пишет moderator-log.

## PHP-код

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdmin();

$input = json_decode(
    file_get_contents('php://input'),
    true
);

$mailingId = (int) ($input['mailing_id'] ?? 0);

if ($mailingId <= 0) {
    errorResponse('Не указан идентификатор рассылки', 422);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            id,
            status
        FROM mailings
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $mailingId,
    ]);

    $mailing = $stmt->fetch();

    if (!$mailing) {
        errorResponse('Рассылка не найдена', 404);
    }

    if ($mailing['status'] !== 'draft') {
        errorResponse(
            'Удалять можно только черновики',
            422
        );
    }

    $deleteStmt = $pdo->prepare("
        DELETE FROM mailings
        WHERE id = :id
        LIMIT 1
    ");

    $deleteStmt->execute([
        'id' => $mailingId,
    ]);

    successResponse([
        'message' => 'Черновик удалён',
    ]);
} catch (Throwable $e) {
    errorResponse(
        'Не удалось удалить рассылку',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-05 | Файл актуализирован по коду с хоста. |