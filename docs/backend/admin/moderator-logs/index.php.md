# api/admin/moderator-logs/index.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Moderator Logs |
| Тип | PHP endpoint |
| Авторизация | Требуется admin session |
| Middleware | `requireAdmin()` |
| Источник | Код с хоста `api/admin/moderator-logs/index.php` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Возвращает логи действий модераторов и список сотрудников админки.

Endpoint отдаёт два массива:

- `logs` — последние действия из таблицы `moderator_logs`;
- `staff` — пользователи с ролями `admin` и `moderator`.

## Метод и URL

```http
GET /api/admin/moderator-logs/index.php
```

## Авторизация

Требуется административная сессия.

Проверка выполняется через:

```php
requireAdmin();
```

Важно: endpoint доступен именно администратору. Модератору доступ не выдаётся.

## Request

Тело запроса не требуется.

Query-параметров в текущей реализации нет.

## Success response

```json
{
  "success": true,
  "logs": [
    {
      "id": 1,
      "moderator_id": 5,
      "action_type": "publish",
      "entity_type": "place",
      "entity_id": 123,
      "description": "Опубликовано объявление: Название места",
      "created_at": "2026-07-05 12:00:00",
      "moderator_email": "moderator@example.com",
      "moderator_first_name": "Иван",
      "moderator_last_name": "Иванов"
    }
  ],
  "staff": [
    {
      "id": 1,
      "email": "admin@example.com",
      "first_name": "Admin",
      "last_name": "User",
      "role_code": "admin",
      "role_title": "Администратор"
    },
    {
      "id": 5,
      "email": "moderator@example.com",
      "first_name": "Иван",
      "last_name": "Иванов",
      "role_code": "moderator",
      "role_title": "Модератор"
    }
  ]
}
```

## Структура `logs[]`

| Поле | Тип | Описание |
|---|---:|---|
| `id` | number | ID записи лога |
| `moderator_id` | number/null | ID модератора/админа |
| `action_type` | string | Тип действия |
| `entity_type` | string | Тип сущности |
| `entity_id` | number/null | ID сущности |
| `description` | string | Описание действия |
| `created_at` | string | Дата создания лога |
| `moderator_email` | string/null | Email модератора |
| `moderator_first_name` | string/null | Имя модератора |
| `moderator_last_name` | string/null | Фамилия модератора |

## Структура `staff[]`

| Поле | Тип | Описание |
|---|---:|---|
| `id` | number | ID пользователя |
| `email` | string | Email |
| `first_name` | string/null | Имя |
| `last_name` | string/null | Фамилия |
| `role_code` | string | Код роли |
| `role_title` | string | Название роли |

## Сортировка

### Логи

Логи сортируются от новых к старым:

```sql
ORDER BY ml.created_at DESC, ml.id DESC
LIMIT 200
```

### Staff

Сначала администраторы, потом модераторы:

```sql
ORDER BY
    CASE r.code
        WHEN 'admin' THEN 0
        WHEN 'moderator' THEN 1
        ELSE 2
    END,
    u.first_name ASC,
    u.email ASC
```

## Error responses

### 401 / 403 — нет доступа

Формируется в `requireAdmin()`.

Точный формат зависит от реализации `api/admin/shared/require-admin.php`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось получить логи модераторов",
  "error": "..."
}
```

## Frontend notes

- Используется для страницы просмотра действий модераторов.
- Показывать можно:
  - кто выполнил действие;
  - что сделал;
  - с какой сущностью;
  - когда.
- `staff` можно использовать для фильтра по сотруднику, даже если текущий endpoint сам фильтр не принимает.
- В текущей реализации backend возвращает только последние 200 логов.
- В текущей реализации нет query-фильтров по модератору, действию, сущности или периоду.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdmin()`.
- Подключение к базе фактически приходит через `require-admin.php`.
- Логи берутся из таблицы `moderator_logs`.
- Информация о модераторе подтягивается из `users` через `LEFT JOIN`.
- Список сотрудников берётся из `users` + `roles`.
- В `staff` попадают только пользователи с ролями:
  - `admin`;
  - `moderator`.
- Endpoint не пишет moderator-log, потому что только читает данные.

## PHP-код

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdmin();

try {
    $pdo = getDatabaseConnection();

    $logsStmt = $pdo->query("
        SELECT
            ml.id,
            ml.moderator_id,
            ml.action_type,
            ml.entity_type,
            ml.entity_id,
            ml.description,
            ml.created_at,

            u.email AS moderator_email,
            u.first_name AS moderator_first_name,
            u.last_name AS moderator_last_name
        FROM moderator_logs ml
        LEFT JOIN users u
            ON u.id = ml.moderator_id
        ORDER BY ml.created_at DESC, ml.id DESC
        LIMIT 200
    ");

    $staffStmt = $pdo->query("
        SELECT
            u.id,
            u.email,
            u.first_name,
            u.last_name,
            r.code AS role_code,
            r.title AS role_title
        FROM users u
        INNER JOIN roles r
            ON r.id = u.role_id
        WHERE r.code IN ('admin', 'moderator')
        ORDER BY
            CASE r.code
                WHEN 'admin' THEN 0
                WHEN 'moderator' THEN 1
                ELSE 2
            END,
            u.first_name ASC,
            u.email ASC
    ");

    successResponse([
        'logs' => $logsStmt->fetchAll(),
        'staff' => $staffStmt->fetchAll(),
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить логи модераторов', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-05 | Файл оформлен по коду с хоста и перенесён в структуру `docs/backend/admin/moderator-logs`. |