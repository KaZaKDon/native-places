# api/admin/appeals/update.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Appeals |
| Тип | PHP endpoint |
| Авторизация | Требуется admin/moderator session |
| Middleware | `requireAdminOrModerator()` |
| Логирование | `writeModeratorLog()` |
| Источник | Код с хоста `api/admin/appeals/update.php` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Обновляет обращение пользователя из административной панели.

Endpoint позволяет:

- изменить статус обращения;
- сохранить ответ администрации;
- закрыть обращение;
- вернуть обращение из закрытого состояния в другой статус.

## Метод и URL

```http
POST /api/admin/appeals/update.php
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
  "id": 5,
  "status": "closed",
  "admin_response": "Спасибо за обращение. Мы всё проверили."
}
```

### Поля

| Поле | Тип | Обязательное | Описание |
|---|---:|---:|---|
| `id` | number | да | ID обращения |
| `status` | string | да | Новый статус обращения |
| `admin_response` | string | нет | Ответ администрации |

## Allowed statuses

```php
$allowedStatuses = [
    'new',
    'in_work',
    'closed',
];
```

| Статус | Описание |
|---|---|
| `new` | Новое обращение |
| `in_work` | В работе |
| `closed` | Закрыто |

## Валидация

| Поле | Условие | Ошибка |
|---|---|---|
| `id` | Не передан или меньше/равен нулю | `Не передан ID обращения` |
| `status` | Не входит в список разрешённых | `Некорректный статус обращения` |
| `admin_response` | Длиннее 5000 символов | `Ответ администрации слишком длинный` |

## Логика `closed_at`

Если новый статус:

```txt
closed
```

то устанавливается:

```txt
closed_at = NOW()
```

Если новый статус любой другой:

```txt
closed_at = NULL
```

## Success response

```json
{
  "success": true,
  "message": "Обращение обновлено",
  "appeal_id": 5,
  "status": "closed"
}
```

## Error responses

### 422 — не передан ID обращения

```json
{
  "success": false,
  "message": "Не передан ID обращения"
}
```

### 422 — некорректный статус

```json
{
  "success": false,
  "message": "Некорректный статус обращения"
}
```

### 422 — слишком длинный ответ администрации

```json
{
  "success": false,
  "message": "Ответ администрации слишком длинный"
}
```

### 404 — обращение не найдено

```json
{
  "success": false,
  "message": "Обращение не найдено"
}
```

### 401 / 403 — нет доступа

Формируется в `requireAdminOrModerator()`.

Точный формат зависит от реализации `api/admin/shared/require-admin.php`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось обновить обращение",
  "error": "..."
}
```

## Frontend notes

- Используется в карточке обращения.
- Можно менять статус и сохранять ответ администрации.
- Если `admin_response` пустой, backend сохранит `NULL`.
- Если статус `closed`, обращение считается закрытым.
- Если после закрытия поставить `new` или `in_work`, backend сбросит `closed_at` в `NULL`.
- После успешного ответа нужно обновить карточку через `show.php` или список через `index.php`.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdminOrModerator()`.
- Использует `moderator-log.php`.
- Работает внутри транзакции.
- При ошибке транзакция откатывается.
- Проверяет существование обращения.
- Обновляет:
  - `status`;
  - `admin_response`;
  - `updated_at`;
  - `closed_at`.
- Логирует действие `update_appeal` для сущности `appeal`.

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

$appealId = (int) ($input['id'] ?? 0);
$status = trim((string) ($input['status'] ?? ''));
$adminResponse = trim((string) ($input['admin_response'] ?? ''));

$allowedStatuses = [
    'new',
    'in_work',
    'closed',
];

if ($appealId <= 0) {
    errorResponse('Не передан ID обращения', 422);
}

if (!in_array($status, $allowedStatuses, true)) {
    errorResponse('Некорректный статус обращения', 422);
}

if (mb_strlen($adminResponse, 'UTF-8') > 5000) {
    errorResponse('Ответ администрации слишком длинный', 422);
}

try {
    $pdo = getDatabaseConnection();

    $pdo->beginTransaction();

    $stmt = $pdo->prepare("
        SELECT
            id,
            user_id,
            appeal_type,
            status
        FROM appeals
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $appealId,
    ]);

    $appeal = $stmt->fetch();

    if (!$appeal) {
        $pdo->rollBack();
        errorResponse('Обращение не найдено', 404);
    }

    $updateStmt = $pdo->prepare("
        UPDATE appeals
        SET
            status = :status,
            admin_response = :admin_response,
            updated_at = NOW(),
            closed_at = CASE
                WHEN :closed_status_check = 'closed' THEN NOW()
                ELSE NULL
            END
        WHERE id = :id
        LIMIT 1
    ");

    $updateStmt->execute([
        'status' => $status,
        'admin_response' => $adminResponse !== '' ? $adminResponse : null,
        'closed_status_check' => $status,
        'id' => $appealId,
    ]);

    writeModeratorLog(
        (int) $adminUser['id'],
        'update_appeal',
        'appeal',
        $appealId,
        'Обновлено обращение #' . $appealId . ': статус ' . $appeal['status'] . ' → ' . $status,
        $pdo
    );

    $pdo->commit();

    successResponse([
        'message' => 'Обращение обновлено',
        'appeal_id' => $appealId,
        'status' => $status,
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось обновить обращение', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-05 | Файл оформлен по коду с хоста и перенесён в структуру `docs/backend/admin/appeals`. |