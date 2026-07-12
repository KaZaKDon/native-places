# api/admin/users/make-moderator.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Users |
| Тип | PHP endpoint |
| Авторизация | Требуется admin session |
| Middleware | `requireAdmin()` |
| Логирование | `writeModeratorLog()` |
| Источник | Код с хоста `api/admin/users/make-moderator.php` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Назначает пользователя модератором.

Endpoint:

1. принимает `user_id`;
2. проверяет пользователя;
3. запрещает назначать модератором заблокированного или удалённого пользователя;
4. запрещает назначать администратора модератором;
5. если пользователь уже модератор — возвращает успешный ответ без изменений;
6. ищет роль `moderator`;
7. обновляет `users.role_id`;
8. пишет действие в лог модераторов.

## Метод и URL

```http
POST /api/admin/users/make-moderator.php
```

## Авторизация

Требуется административная сессия.

Проверка выполняется через:

```php
$adminUser = requireAdmin();
```

Endpoint доступен именно администратору.

## Request

### Body

```json
{
  "user_id": 15
}
```

### Поля

| Поле | Тип | Обязательное | Описание |
|---|---:|---:|---|
| `user_id` | number | да | ID пользователя |

## Success response

### Пользователь назначен модератором

```json
{
  "success": true,
  "message": "Пользователь назначен модератором",
  "user_id": 15
}
```

### Пользователь уже был модератором

```json
{
  "success": true,
  "message": "Пользователь уже является модератором",
  "user_id": 15
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

### 404 — пользователь не найден

```json
{
  "success": false,
  "message": "Пользователь не найден"
}
```

### 403 — пользователь заблокирован или удалён

```json
{
  "success": false,
  "message": "Нельзя назначить модератором заблокированного или удалённого пользователя"
}
```

### 422 — пользователь является администратором

```json
{
  "success": false,
  "message": "Администратора нельзя назначить модератором"
}
```

### 500 — роль moderator не найдена

```json
{
  "success": false,
  "message": "Роль moderator не найдена"
}
```

### 401 / 403 — нет доступа

Формируется в `requireAdmin()`.

Точный формат зависит от реализации `api/admin/shared/require-admin.php`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось назначить модератора",
  "error": "..."
}
```

## Frontend notes

- Используется в карточке пользователя в блоке модерации.
- После успешного назначения можно предложить создать код доступа через `generate-moderator-code.php`.
- Если пользователь уже модератор, backend возвращает success, это не ошибка.
- Администратора нельзя понизить этим endpoint-ом до модератора.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdmin()`.
- Использует `moderator-log.php`.
- Подключение к базе фактически приходит через `require-admin.php`.
- Endpoint не использует транзакцию.
- Роль модератора ищется в таблице `roles` по `code = 'moderator'`.
- После обновления роли пишется лог действия `make_moderator`.

## PHP-код

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';
require_once __DIR__ . '/../shared/moderator-log.php';

$adminUser = requireAdmin();

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    $input = [];
}

$userId = (int) ($input['user_id'] ?? 0);

if ($userId <= 0) {
    errorResponse('Не передан ID пользователя', 422);
}

try {
    $pdo = getDatabaseConnection();

    $userStmt = $pdo->prepare("
        SELECT
            u.id,
            u.email,
            u.first_name,
            u.last_name,
            u.status,
            r.code AS role_code
        FROM users u
        INNER JOIN roles r
            ON r.id = u.role_id
        WHERE u.id = :id
        LIMIT 1
    ");

    $userStmt->execute([
        'id' => $userId,
    ]);

    $user = $userStmt->fetch();

    if (!$user) {
        errorResponse('Пользователь не найден', 404);
    }

    if ($user['status'] !== 'active') {
        errorResponse('Нельзя назначить модератором заблокированного или удалённого пользователя', 403);
    }

    if ($user['role_code'] === 'admin') {
        errorResponse('Администратора нельзя назначить модератором', 422);
    }

    if ($user['role_code'] === 'moderator') {
        successResponse([
            'message' => 'Пользователь уже является модератором',
            'user_id' => $userId,
        ]);
    }

    $roleStmt = $pdo->prepare("
        SELECT id
        FROM roles
        WHERE code = 'moderator'
        LIMIT 1
    ");

    $roleStmt->execute();

    $role = $roleStmt->fetch();

    if (!$role) {
        errorResponse('Роль moderator не найдена', 500);
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
        'id' => $userId,
        'role_id' => (int) $role['id'],
    ]);

    writeModeratorLog(
        (int) $adminUser['id'],
        'make_moderator',
        'user',
        $userId,
        'Пользователь назначен модератором: ' . ($user['email'] ?? ('#' . $userId))
    );

    successResponse([
        'message' => 'Пользователь назначен модератором',
        'user_id' => $userId,
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось назначить модератора', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Файл оформлен по коду с хоста и перенесён в структуру `docs/backend/admin/users`. |