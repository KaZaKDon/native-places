# api/admin/access-codes/index.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Access Codes |
| Тип | PHP endpoint |
| Авторизация | Требуется admin session |
| Middleware | `requireAdmin()` |
| Источник | Код с хоста `api/admin/access-codes/index.php` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Возвращает список кодов доступа для административной панели.

Endpoint отдаёт коды доступа без открытого значения кода. В базе хранится только хеш, поэтому `plain_code` в списке отсутствует.

## Метод и URL

```http
GET /api/admin/access-codes/index.php
```

## Авторизация

Требуется административная сессия.

Проверка выполняется через:

```php
requireAdmin();
```

Endpoint доступен именно администратору.

## Request

Тело запроса не требуется.

Query-параметров в текущей реализации нет.

## Success response

```json
{
  "success": true,
  "access_codes": [
    {
      "id": 1,
      "role_code": "moderator",
      "display_name": "Модератор Иван",
      "status": "active",
      "expires_at": "2026-08-01 12:00:00",
      "last_login_at": null,
      "created_at": "2026-07-05 12:00:00"
    }
  ]
}
```

## Структура `access_codes[]`

| Поле | Тип | Описание |
|---|---:|---|
| `id` | number | ID кода доступа |
| `role_code` | string | Роль, которую даёт код |
| `display_name` | string | Отображаемое имя |
| `status` | string | Статус кода |
| `expires_at` | string/null | Дата окончания действия |
| `last_login_at` | string/null | Последний вход по коду |
| `created_at` | string | Дата создания |

## Сортировка

```sql
ORDER BY created_at DESC, id DESC
```

## Error responses

### 401 / 403 — нет доступа

Формируется в `requireAdmin()`.

Точный формат зависит от реализации `api/admin/shared/require-admin.php`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось получить коды доступа",
  "error": "..."
}
```

## Frontend notes

- Используется для списка кодов доступа.
- Открытый код доступа в списке не возвращается.
- Открытый код можно получить только при создании через `create.php`.
- Для отключения кода использовать `disable.php`.
- Если `expires_at = null`, значит дата окончания не задана.
- В этой старой схеме коды не привязаны к пользователям.
- В новой схеме коды модераторов создаются через `api/admin/users/generate-moderator-code.php`.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdmin()`.
- Подключение к базе фактически приходит через `require-admin.php`.
- Данные берутся из таблицы `admin_access_codes`.
- `code_hash` не возвращается.
- Endpoint не пишет moderator-log, потому что только читает данные.

## PHP-код

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdmin();

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->query("
        SELECT
            id,
            role_code,
            display_name,
            status,
            expires_at,
            last_login_at,
            created_at
        FROM admin_access_codes
        ORDER BY created_at DESC, id DESC
    ");

    successResponse([
        'access_codes' => $stmt->fetchAll(),
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить коды доступа', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-05 | Файл оформлен по коду с хоста и перенесён в структуру `docs/backend/admin/access-codes`. |