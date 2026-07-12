# api/admin/auth/login-code.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Auth |
| Тип | PHP endpoint |
| Авторизация | Не требуется |
| Сессия | Создаёт `$_SESSION['admin_user']` |
| Источник | Код с хоста `api/admin/auth/login-code.php` |
| Готовность | Актуализировано по коду с хоста |

## Назначение

Выполняет вход в админку по коду доступа модератора.

Актуальная версия работает по новой схеме:

```txt
код доступа -> admin_access_codes.user_id -> users.id
```

То есть код доступа должен быть привязан к реальному пользователю.

Endpoint проверяет:

- наличие кода;
- совпадение кода с `code_hash`;
- активность кода;
- срок действия кода;
- привязку к `user_id`;
- существование пользователя;
- активность пользователя;
- роль пользователя `moderator`.

После успешной проверки создаёт административную сессию с `access_type = code`.

## Метод и URL

```http
POST /api/admin/auth/login-code.php
```

## Авторизация

Не требуется.

Это endpoint входа по коду доступа.

## Request

```json
{
  "code": "NP-12345678-ABCDEFGH"
}
```

## Success response

```json
{
  "success": true,
  "message": "Вход по коду выполнен",
  "authenticated": true,
  "user": {
    "id": 15,
    "access_code_id": 3,
    "email": "moderator@example.com",
    "name": "Модератор Иван",
    "role_code": "moderator",
    "role_title": "Модератор",
    "access_type": "code"
  }
}
```

## Error responses

### 422 — код не передан

```json
{
  "success": false,
  "message": "Введите код доступа"
}
```

### 401 — неверный код

```json
{
  "success": false,
  "message": "Неверный код доступа"
}
```

### 403 — срок действия истёк

```json
{
  "success": false,
  "message": "Срок действия кода истёк"
}
```

При этом backend отключает код:

```sql
UPDATE admin_access_codes
SET status = 'disabled'
WHERE id = :id
LIMIT 1
```

### 422 — код не привязан к пользователю

```json
{
  "success": false,
  "message": "Код доступа не привязан к пользователю"
}
```

### 404 — пользователь не найден

```json
{
  "success": false,
  "message": "Пользователь для кода доступа не найден"
}
```

### 403 — пользователь заблокирован или удалён

```json
{
  "success": false,
  "message": "Пользователь заблокирован или удалён"
}
```

### 403 — пользователь больше не модератор

```json
{
  "success": false,
  "message": "Пользователь больше не является модератором"
}
```

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось выполнить вход по коду",
  "error": "..."
}
```

## Frontend notes

- Используется для входа модератора по коду.
- Код должен быть создан через `api/admin/users/generate-moderator-code.php`.
- Старые коды без `user_id` теперь не пройдут вход и вернут:
  ```txt
  Код доступа не привязан к пользователю
  ```
- Если код истёк, backend автоматически отключит его.
- После успешного входа frontend должен считать пользователя авторизованным в админке.
- Для проверки сессии после перезагрузки использовать `me.php`.

## Backend notes

- Использует `session_regenerate_id(true)` после успешной проверки.
- Проверяет `admin_access_codes.status = active`.
- Проверяет `expires_at`.
- Проверяет связь `admin_access_codes.user_id`.
- Проверяет пользователя из `users`.
- Проверяет роль пользователя через `roles`.
- Разрешена только роль `moderator`.
- В сессию сохраняется:
  - `id` пользователя;
  - `access_code_id`;
  - email;
  - name;
  - role_code;
  - role_title;
  - access_type.

## PHP-код

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../../shared/response.php';
require_once __DIR__ . '/../../config/database.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$input = json_decode(
    file_get_contents('php://input'),
    true
);

if (!is_array($input)) {
    $input = [];
}

$code = trim($input['code'] ?? '');

if ($code === '') {
    errorResponse('Введите код доступа', 422);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            id,
            user_id,
            role_code,
            display_name,
            code_hash,
            status,
            expires_at
        FROM admin_access_codes
        WHERE status = 'active'
        ORDER BY id ASC
    ");

    $stmt->execute();

    $accessItems = $stmt->fetchAll();

    $matchedAccess = null;

    foreach ($accessItems as $item) {
        if (password_verify($code, $item['code_hash'])) {
            $matchedAccess = $item;
            break;
        }
    }

    if (!$matchedAccess) {
        errorResponse('Неверный код доступа', 401);
    }

    if (!empty($matchedAccess['expires_at'])) {
        $expiresAt = strtotime($matchedAccess['expires_at']);

        if ($expiresAt !== false && $expiresAt < time()) {
            $disableStmt = $pdo->prepare("
                UPDATE admin_access_codes
                SET status = 'disabled'
                WHERE id = :id
                LIMIT 1
            ");

            $disableStmt->execute([
                'id' => (int) $matchedAccess['id'],
            ]);

            errorResponse('Срок действия кода истёк', 403);
        }
    }

    $userId = (int) ($matchedAccess['user_id'] ?? 0);

    if ($userId <= 0) {
        errorResponse('Код доступа не привязан к пользователю', 422);
    }

    $userStmt = $pdo->prepare("
        SELECT
            u.id,
            u.email,
            u.first_name,
            u.last_name,
            u.status,
            r.code AS role_code,
            r.title AS role_title
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
        errorResponse('Пользователь для кода доступа не найден', 404);
    }

    if ($user['status'] !== 'active') {
        errorResponse('Пользователь заблокирован или удалён', 403);
    }

    if ($user['role_code'] !== 'moderator') {
        errorResponse('Пользователь больше не является модератором', 403);
    }

    $updateStmt = $pdo->prepare("
        UPDATE admin_access_codes
        SET last_login_at = NOW()
        WHERE id = :id
        LIMIT 1
    ");

    $updateStmt->execute([
        'id' => (int) $matchedAccess['id'],
    ]);

    session_regenerate_id(true);

    $displayName = trim((string) ($matchedAccess['display_name'] ?? ''));

    if ($displayName === '') {
        $displayName = trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? ''));
    }

    if ($displayName === '') {
        $displayName = $user['email'];
    }

    $_SESSION['admin_user'] = [
        'id' => (int) $user['id'],
        'access_code_id' => (int) $matchedAccess['id'],
        'email' => $user['email'],
        'name' => $displayName,
        'role_code' => $user['role_code'],
        'role_title' => $user['role_title'],
        'access_type' => 'code',
    ];

    successResponse([
        'message' => 'Вход по коду выполнен',
        'authenticated' => true,
        'user' => $_SESSION['admin_user'],
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось выполнить вход по коду', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-05 | Файл актуализирован по коду с хоста. |