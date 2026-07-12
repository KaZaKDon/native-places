# api/admin/users/update-status.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Users |
| Тип | PHP endpoint |
| Авторизация | Требуется admin session |
| Middleware | `requireAdmin()` |
| Источник | Код с хоста `api/admin/users/update-status.php` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Обновляет статус пользователя.

Endpoint позволяет установить один из статусов:

- `active`;
- `blocked`;
- `deleted`.

При этом текущий администратор не может заблокировать или удалить собственный аккаунт.

## Метод и URL

```http
POST /api/admin/users/update-status.php
```

## Авторизация

Требуется административная сессия.

Проверка выполняется через:

```php
$currentAdmin = requireAdmin();
```

Endpoint доступен именно администратору.

## Request

### Body

```json
{
  "id": 15,
  "status": "blocked"
}
```

### Поля

| Поле | Тип | Обязательное | Описание |
|---|---:|---:|---|
| `id` | number | да | ID пользователя |
| `status` | string | да | Новый статус пользователя |

## Allowed statuses

```php
$allowedStatuses = ['active', 'blocked', 'deleted'];
```

| Статус | Описание |
|---|---|
| `active` | Активный пользователь |
| `blocked` | Заблокированный пользователь |
| `deleted` | Удалённый/деактивированный пользователь |

## Success response

```json
{
  "success": true,
  "message": "Статус пользователя обновлён",
  "user_id": 15,
  "status": "blocked"
}
```

## Error responses

### 422 — не передан ID пользователя

```json
{
  "success": false,
  "message": "Не передан ID пользователя"
}
```

### 422 — некорректный статус

```json
{
  "success": false,
  "message": "Некорректный статус пользователя"
}
```

### 422 — нельзя заблокировать или удалить текущего администратора

```json
{
  "success": false,
  "message": "Нельзя заблокировать или удалить текущий аккаунт администратора"
}
```

### 404 — пользователь не найден

```json
{
  "success": false,
  "message": "Пользователь не найден"
}
```

### 401 / 403 — нет доступа

Формируется в `requireAdmin()`.

Точный формат зависит от реализации `api/admin/shared/require-admin.php`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось обновить статус пользователя",
  "error": "..."
}
```

## Frontend notes

- Используется в карточке пользователя или таблице пользователей.
- Для текущего аккаунта администратора нельзя выбирать `blocked` или `deleted`.
- После успешного ответа нужно обновить карточку пользователя через `show.php` или список через `index.php`.
- Статусы лучше отображать понятными названиями:
  - `active` → активен;
  - `blocked` → заблокирован;
  - `deleted` → удалён.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdmin()`.
- Подключение к базе фактически приходит через `require-admin.php`.
- Endpoint не использует транзакцию.
- Endpoint не пишет moderator-log.
- Проверяет существование пользователя перед обновлением.
- Не даёт текущему администратору заблокировать или удалить самого себя.

## PHP-код

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

$currentAdmin = requireAdmin();

$input = json_decode(file_get_contents('php://input'), true);

$userId = (int) ($input['id'] ?? 0);
$status = trim($input['status'] ?? '');

$allowedStatuses = ['active', 'blocked', 'deleted'];

if ($userId <= 0) {
    errorResponse('Не передан ID пользователя', 422);
}

if (!in_array($status, $allowedStatuses, true)) {
    errorResponse('Некорректный статус пользователя', 422);
}

if ((int) $currentAdmin['id'] === $userId && $status !== 'active') {
    errorResponse('Нельзя заблокировать или удалить текущий аккаунт администратора', 422);
}

try {
    $pdo = getDatabaseConnection();

    $userStmt = $pdo->prepare("
        SELECT id
        FROM users
        WHERE id = :id
        LIMIT 1
    ");

    $userStmt->execute([
        'id' => $userId,
    ]);

    $user = $userStmt->fetch();

    if (!$user) {
        errorResponse('Пользователь не найден', 404);
    }

    $updateStmt = $pdo->prepare("
        UPDATE users
        SET
            status = :status,
            updated_at = NOW()
        WHERE id = :id
        LIMIT 1
    ");

    $updateStmt->execute([
        'status' => $status,
        'id' => $userId,
    ]);

    successResponse([
        'message' => 'Статус пользователя обновлён',
        'user_id' => $userId,
        'status' => $status,
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось обновить статус пользователя', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Файл оформлен по коду с хоста и перенесён в структуру `docs/backend/admin/users`. |