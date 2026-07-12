# api/admin/users/update-role.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Users |
| Тип | PHP endpoint |
| Авторизация | Требуется admin session |
| Middleware | `requireAdmin()` |
| Источник | Код с хоста `api/admin/users/update-role.php` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Обновляет роль пользователя.

Endpoint:

1. принимает ID пользователя;
2. принимает код новой роли;
3. проверяет существование роли;
4. проверяет существование пользователя;
5. запрещает текущему администратору снять с себя роль `admin`;
6. обновляет `users.role_id`;
7. возвращает новую роль.

## Метод и URL

```http
POST /api/admin/users/update-role.php
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
  "role_code": "moderator"
}
```

### Поля

| Поле | Тип | Обязательное | Описание |
|---|---:|---:|---|
| `id` | number | да | ID пользователя |
| `role_code` | string | да | Код новой роли |

## Success response

```json
{
  "success": true,
  "message": "Роль пользователя обновлена",
  "user_id": 15,
  "role": {
    "id": 3,
    "code": "moderator",
    "title": "Модератор"
  }
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

### 422 — не передана роль

```json
{
  "success": false,
  "message": "Не передана роль пользователя"
}
```

### 404 — роль не найдена

```json
{
  "success": false,
  "message": "Роль не найдена"
}
```

### 404 — пользователь не найден

```json
{
  "success": false,
  "message": "Пользователь не найден"
}
```

### 422 — нельзя снять admin с текущего аккаунта

```json
{
  "success": false,
  "message": "Нельзя снять роль администратора с текущего аккаунта"
}
```

### 401 / 403 — нет доступа

Формируется в `requireAdmin()`.

Точный формат зависит от реализации `api/admin/shared/require-admin.php`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось обновить роль пользователя",
  "error": "..."
}
```

## Frontend notes

- Используется в карточке пользователя для смены роли.
- Передавать нужно именно `role_code`, а не `role_id`.
- Текущий администратор не может снять с себя роль `admin`.
- После успешного ответа можно обновить карточку пользователя через `show.php`.
- Для назначения модератором есть отдельный endpoint `make-moderator.php`, но этот endpoint тоже может сменить роль, если передать соответствующий `role_code`.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdmin()`.
- Подключение к базе фактически приходит через `require-admin.php`.
- Роль ищется в таблице `roles` по `code`.
- Пользователь ищется в таблице `users` по `id`.
- Endpoint не использует транзакцию.
- Endpoint не пишет moderator-log.
- Endpoint не проверяет статус пользователя.

## PHP-код

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

$currentAdmin = requireAdmin();

$input = json_decode(file_get_contents('php://input'), true);

$userId = (int) ($input['id'] ?? 0);
$roleCode = trim($input['role_code'] ?? '');

if ($userId <= 0) {
    errorResponse('Не передан ID пользователя', 422);
}

if ($roleCode === '') {
    errorResponse('Не передана роль пользователя', 422);
}

try {
    $pdo = getDatabaseConnection();

    $roleStmt = $pdo->prepare("
        SELECT id, code, title
        FROM roles
        WHERE code = :code
        LIMIT 1
    ");

    $roleStmt->execute([
        'code' => $roleCode,
    ]);

    $role = $roleStmt->fetch();

    if (!$role) {
        errorResponse('Роль не найдена', 404);
    }

    $userStmt = $pdo->prepare("
        SELECT id, role_id
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

    if ((int) $currentAdmin['id'] === $userId && $roleCode !== 'admin') {
        errorResponse('Нельзя снять роль администратора с текущего аккаунта', 422);
    }

    $updateStmt = $pdo->prepare("
        UPDATE users
        SET
            role_id = :role_id,
            updated_at = NOW()
        WHERE id = :id
        LIMIT 1
    ");

    $updateStmt->execute([
        'role_id' => (int) $role['id'],
        'id' => $userId,
    ]);

    successResponse([
        'message' => 'Роль пользователя обновлена',
        'user_id' => $userId,
        'role' => [
            'id' => (int) $role['id'],
            'code' => $role['code'],
            'title' => $role['title'],
        ],
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось обновить роль пользователя', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Файл оформлен по коду с хоста и перенесён в структуру `docs/backend/admin/users`. |