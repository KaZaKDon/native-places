# api/admin/users/generate-moderator-code.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Users |
| Тип | PHP endpoint |
| Авторизация | Требуется admin session |
| Middleware | `requireAdmin()` |
| Логирование | `writeModeratorLog()` |
| Источник | Код с хоста `api/admin/users/generate-moderator-code.php` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Создаёт новый код доступа для пользователя-модератора.

Endpoint:

1. принимает `user_id`;
2. принимает срок действия кода в днях;
3. проверяет существование пользователя;
4. проверяет, что пользователь активен;
5. проверяет, что пользователь уже имеет роль `moderator`;
6. отключает старые активные коды пользователя;
7. генерирует новый код;
8. сохраняет хеш кода в `admin_access_codes`;
9. возвращает открытый код один раз в ответе;
10. пишет действие в лог модераторов.

## Метод и URL

```http
POST /api/admin/users/generate-moderator-code.php
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
  "user_id": 15,
  "expires_days": 30
}
```

### Поля

| Поле | Тип | Обязательное | Описание |
|---|---:|---:|---|
| `user_id` | number | да | ID пользователя |
| `expires_days` | number | нет | Срок действия кода в днях. По умолчанию `30` |

## Правила `expires_days`

| Условие | Поведение |
|---|---|
| Не передан | Используется `30` |
| Меньше или равен `0` | Используется `30` |
| Больше `365` | Ограничивается до `365` |

## Success response

Код ответа: `201`.

```json
{
  "success": true,
  "message": "Код модератора создан",
  "user_id": 15,
  "access_code": "NP-1A2B3C4D-5E6F7A8B",
  "expires_days": 30,
  "expires_at": "2026-08-03 12:00:00"
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
  "message": "Нельзя создать код для заблокированного или удалённого пользователя"
}
```

### 422 — пользователь ещё не модератор

```json
{
  "success": false,
  "message": "Сначала назначьте пользователя модератором"
}
```

### 401 / 403 — нет доступа

Формируется в `requireAdmin()`.

Точный формат зависит от реализации `api/admin/shared/require-admin.php`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось создать код модератора",
  "error": "..."
}
```

## Frontend notes

- Используется в карточке пользователя для генерации кода входа модератора.
- Перед вызовом пользователь уже должен иметь роль `moderator`.
- Если пользователь ещё не модератор, сначала нужно вызвать `make-moderator.php`.
- `access_code` возвращается только в момент создания. Его нужно сразу показать администратору.
- Старые активные коды этого пользователя автоматически отключаются.
- Срок действия кода ограничен максимум 365 днями.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdmin()`.
- Использует `moderator-log.php`.
- Работает внутри транзакции.
- При ошибке транзакция откатывается.
- Старые активные коды отключаются через:
  ```sql
  UPDATE admin_access_codes
  SET status = 'disabled'
  WHERE user_id = :user_id
  AND status = 'active'
  ```
- Новый код создаётся в формате:
  ```txt
  NP-XXXXXXXX-XXXXXXXX
  ```
- В базе хранится не сам код, а `password_hash`.
- В ответе возвращается открытый код `access_code`.

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
$expiresDays = (int) ($input['expires_days'] ?? 30);

if ($userId <= 0) {
    errorResponse('Не передан ID пользователя', 422);
}

if ($expiresDays <= 0) {
    $expiresDays = 30;
}

if ($expiresDays > 365) {
    $expiresDays = 365;
}

try {
    $pdo = getDatabaseConnection();

    $pdo->beginTransaction();

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
        $pdo->rollBack();
        errorResponse('Пользователь не найден', 404);
    }

    if ($user['status'] !== 'active') {
        $pdo->rollBack();
        errorResponse('Нельзя создать код для заблокированного или удалённого пользователя', 403);
    }

    if (($user['role_code'] ?? '') !== 'moderator') {
        $pdo->rollBack();
        errorResponse('Сначала назначьте пользователя модератором', 422);
    }

    $disableStmt = $pdo->prepare("
        UPDATE admin_access_codes
        SET status = 'disabled'
        WHERE user_id = :user_id
        AND status = 'active'
    ");

    $disableStmt->execute([
        'user_id' => $userId,
    ]);

    $plainCode = 'NP-' . strtoupper(bin2hex(random_bytes(4))) . '-' . strtoupper(bin2hex(random_bytes(4)));
    $codeHash = password_hash($plainCode, PASSWORD_DEFAULT);

    $displayName = trim(
        ($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? '')
    );

    if ($displayName === '') {
        $displayName = $user['email'] ?? ('Модератор #' . $userId);
    }

    $expiresAt = (new DateTimeImmutable())
        ->modify('+' . $expiresDays . ' days')
        ->format('Y-m-d H:i:s');

    $insertStmt = $pdo->prepare("
        INSERT INTO admin_access_codes (
            user_id,
            role_code,
            display_name,
            code_hash,
            status,
            expires_at,
            last_login_at,
            created_at
        ) VALUES (
            :user_id,
            'moderator',
            :display_name,
            :code_hash,
            'active',
            :expires_at,
            NULL,
            NOW()
        )
    ");

    $insertStmt->execute([
        'user_id' => $userId,
        'display_name' => $displayName,
        'code_hash' => $codeHash,
        'expires_at' => $expiresAt,
    ]);

    writeModeratorLog(
        (int) $adminUser['id'],
        'generate_moderator_code',
        'user',
        $userId,
        'Создан новый код входа модератора для пользователя: ' . ($user['email'] ?? ('#' . $userId))
    );

    $pdo->commit();

    successResponse([
        'message' => 'Код модератора создан',
        'user_id' => $userId,
        'access_code' => $plainCode,
        'expires_days' => $expiresDays,
        'expires_at' => $expiresAt,
    ], 201);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось создать код модератора', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Файл оформлен по коду с хоста и перенесён в структуру `docs/backend/admin/users`. |