# api/admin/plans/index.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Plans |
| Тип | PHP endpoint |
| Авторизация | Требуется admin session |
| Middleware | `requireAdmin()` |
| Источник | Код с хоста `api/admin/plans/index.php` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Возвращает список тарифов для административной панели.

Для каждого тарифа дополнительно возвращается количество пользователей с активной подпиской на этот тариф.

## Метод и URL

```http
GET /api/admin/plans/index.php
```

## Авторизация

Требуется административная сессия.

Проверка выполняется через:

```php
requireAdmin();
```

Важно: endpoint доступен именно администратору.

## Request

Тело запроса не требуется.

Query-параметров в текущей реализации нет.

## Success response

```json
{
  "success": true,
  "plans": [
    {
      "id": 1,
      "code": "basic",
      "title": "Basic",
      "description": "Базовый тариф",
      "max_places": 3,
      "duration_days": 14,
      "price": "0.00",
      "is_active": 1,
      "created_at": "2026-06-01 12:00:00",
      "updated_at": "2026-06-01 12:00:00",
      "users_count": 25
    }
  ]
}
```

## Структура `plans[]`

| Поле | Тип | Описание |
|---|---:|---|
| `id` | number | ID тарифа |
| `code` | string | Код тарифа |
| `title` | string | Название тарифа |
| `description` | string/null | Описание |
| `max_places` | number | Лимит объявлений |
| `duration_days` | number | Срок действия в днях |
| `price` | string/number | Цена |
| `is_active` | number | Активность тарифа |
| `created_at` | string | Дата создания |
| `updated_at` | string/null | Дата обновления |
| `users_count` | number | Количество пользователей с активной подпиской |

## Сортировка

```sql
ORDER BY p.price ASC, p.id ASC
```

## Как считается `users_count`

```sql
SELECT
    plan_id,
    COUNT(DISTINCT user_id) AS users_count
FROM user_subscriptions
WHERE status = 'active'
GROUP BY plan_id
```

То есть учитываются только активные подписки.

## Error responses

### 401 / 403 — нет доступа

Формируется в `requireAdmin()`.

Точный формат зависит от реализации `api/admin/shared/require-admin.php`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось получить тарифы",
  "error": "..."
}
```

## Frontend notes

- Используется для таблицы тарифов в админке.
- `users_count` можно показывать как количество пользователей на тарифе.
- Список уже отсортирован backend-ом по цене и ID.
- В текущей версии endpoint не принимает фильтры.
- Для создания тарифа использовать `create.php`.
- Для обновления тарифа использовать `update.php`.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdmin()`.
- Подключение к базе фактически приходит через `require-admin.php`.
- Данные берутся из таблицы `plans`.
- Количество пользователей считается через подзапрос по `user_subscriptions`.
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
            p.id,
            p.code,
            p.title,
            p.description,
            p.max_places,
            p.duration_days,
            p.price,
            p.is_active,
            p.created_at,
            p.updated_at,
            COALESCE(us.users_count, 0) AS users_count
        FROM plans p
        LEFT JOIN (
            SELECT
                plan_id,
                COUNT(DISTINCT user_id) AS users_count
            FROM user_subscriptions
            WHERE status = 'active'
            GROUP BY plan_id
        ) us
            ON us.plan_id = p.id
        ORDER BY p.price ASC, p.id ASC
    ");

    successResponse([
        'plans' => $stmt->fetchAll(),
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить тарифы', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-05 | Файл оформлен по коду с хоста и перенесён в структуру `docs/backend/admin/plans`. |