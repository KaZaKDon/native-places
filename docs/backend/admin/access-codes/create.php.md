# api/admin/access-codes/create.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Access Codes |
| Тип | PHP endpoint |
| Авторизация | Требуется admin session |
| Middleware | `requireAdmin()` |
| Источник | Код с хоста `api/admin/access-codes/create.php` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Создаёт код доступа для входа модератора в админку.

Endpoint:

1. принимает отображаемое имя модератора;
2. опционально принимает дату окончания действия кода;
3. генерирует открытый код;
4. хеширует код через `password_hash`;
5. сохраняет хеш в таблицу `admin_access_codes`;
6. возвращает открытый код в ответе.

Важно: открытый код возвращается только в момент создания.

## Метод и URL

```http
POST /api/admin/access-codes/create.php
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
  "display_name": "Модератор Иван",
  "expires_at": "2026-08-01 12:00:00"
}
```

### Поля

| Поле | Тип | Обязательное | Описание |
|---|---:|---:|---|
| `display_name` | string | да | Отображаемое имя модератора |
| `expires_at` | string | нет | Дата окончания действия кода |

## Success response

Код ответа: `201`.

```json
{
  "success": true,
  "message": "Код доступа создан",
  "access_code": {
    "id": 1,
    "role_code": "moderator",
    "display_name": "Модератор Иван",
    "status": "active",
    "expires_at": "2026-08-01 12:00:00",
    "plain_code": "A1B2C3D4"
  }
}
```

## Error responses

### 422 — не указано имя модератора

```json
{
  "success": false,
  "message": "Введите имя модератора"
}
```

### 401 / 403 — нет доступа

Формируется в `requireAdmin()`.

Точный формат зависит от реализации `api/admin/shared/require-admin.php`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось создать код доступа",
  "error": "..."
}
```

## Frontend notes

- Используется для создания кода доступа модератора.
- `plain_code` нужно показать администратору сразу после создания.
- В списке кодов `plain_code` уже не будет, потому что в базе хранится только хеш.
- `expires_at` можно не передавать — тогда код будет без даты истечения.
- В этой старой схеме код не привязан к `user_id`.
- В новой схеме модераторов есть отдельный endpoint `api/admin/users/generate-moderator-code.php`, который создаёт код для конкретного пользователя-модератора.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdmin()`.
- Подключение к базе фактически приходит через `require-admin.php`.
- Генерирует код через:
  ```php
  strtoupper(bin2hex(random_bytes(4)))
  ```
- В базе хранится `password_hash($plainCode, PASSWORD_DEFAULT)`.
- Код создаётся с:
  ```txt
  role_code = moderator
  status = active
  ```
- Endpoint не использует транзакцию.
- Endpoint не пишет moderator-log.

## PHP-код

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdmin();

$input = json_decode(file_get_contents('php://input'), true);

$displayName = trim($input['display_name'] ?? '');
$expiresAt = trim($input['expires_at'] ?? '');

if ($displayName === '') {
    errorResponse('Введите имя модератора', 422);
}

try {
    $pdo = getDatabaseConnection();

    $plainCode = strtoupper(bin2hex(random_bytes(4)));
    $codeHash = password_hash($plainCode, PASSWORD_DEFAULT);

    $stmt = $pdo->prepare("
        INSERT INTO admin_access_codes (
            role_code,
            display_name,
            code_hash,
            status,
            expires_at,
            created_at
        ) VALUES (
            'moderator',
            :display_name,
            :code_hash,
            'active',
            :expires_at,
            NOW()
        )
    ");

    $stmt->execute([
        'display_name' => $displayName,
        'code_hash' => $codeHash,
        'expires_at' => $expiresAt !== '' ? $expiresAt : null,
    ]);

    successResponse([
        'message' => 'Код доступа создан',
        'access_code' => [
            'id' => (int) $pdo->lastInsertId(),
            'role_code' => 'moderator',
            'display_name' => $displayName,
            'status' => 'active',
            'expires_at' => $expiresAt !== '' ? $expiresAt : null,
            'plain_code' => $plainCode,
        ],
    ], 201);
} catch (Throwable $e) {
    errorResponse('Не удалось создать код доступа', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-05 | Файл оформлен по коду с хоста и перенесён в структуру `docs/backend/admin/access-codes`. |