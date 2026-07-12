# api/admin/categories/index.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Categories |
| Тип | PHP endpoint |
| Авторизация | Требуется admin session |
| Middleware | `requireAdmin()` |
| Источник | Код с хоста `api/admin/categories/index.php` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Возвращает список категорий для административной панели.

Для каждой категории дополнительно возвращается количество объявлений в этой категории.

## Метод и URL

```http
GET /api/admin/categories/index.php
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
  "categories": [
    {
      "id": 1,
      "code": "food",
      "title": "Еда",
      "description": "Кафе и рестораны",
      "icon": "utensils",
      "color": "#FFAA00",
      "sort_order": 10,
      "is_active": 1,
      "created_at": "2026-07-05 12:00:00",
      "updated_at": "2026-07-05 12:00:00",
      "places_count": 25
    }
  ]
}
```

## Структура `categories[]`

| Поле | Тип | Описание |
|---|---:|---|
| `id` | number | ID категории |
| `code` | string | Код категории |
| `title` | string | Название категории |
| `description` | string/null | Описание |
| `icon` | string/null | Иконка |
| `color` | string/null | Цвет |
| `sort_order` | number | Порядок сортировки |
| `is_active` | number | Активность категории |
| `created_at` | string | Дата создания |
| `updated_at` | string/null | Дата обновления |
| `places_count` | number | Количество объявлений в категории |

## Сортировка

```sql
ORDER BY c.sort_order ASC, c.id ASC
```

## Как считается `places_count`

```sql
SELECT
    category_id,
    COUNT(*) AS places_count
FROM places
GROUP BY category_id
```

Учитываются все объявления категории без фильтра по статусу.

## Error responses

### 401 / 403 — нет доступа

Формируется в `requireAdmin()`.

Точный формат зависит от реализации `api/admin/shared/require-admin.php`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось получить категории",
  "error": "..."
}
```

## Frontend notes

- Используется для таблицы категорий в админке.
- `places_count` можно показывать в списке.
- Список уже отсортирован backend-ом по `sort_order` и `id`.
- В текущей версии endpoint не принимает фильтры.
- Для создания категории использовать `create.php`.
- Для редактирования категории использовать `update.php`.
- Для включения/отключения категории использовать `toggle-active.php`.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdmin()`.
- Подключение к базе фактически приходит через `require-admin.php`.
- Данные берутся из таблицы `categories`.
- Количество объявлений считается через подзапрос по `places`.
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
            c.id,
            c.code,
            c.title,
            c.description,
            c.icon,
            c.color,
            c.sort_order,
            c.is_active,
            c.created_at,
            c.updated_at,
            COALESCE(pc.places_count, 0) AS places_count
        FROM categories c
        LEFT JOIN (
            SELECT
                category_id,
                COUNT(*) AS places_count
            FROM places
            GROUP BY category_id
        ) pc
            ON pc.category_id = c.id
        ORDER BY c.sort_order ASC, c.id ASC
    ");

    successResponse([
        'categories' => $stmt->fetchAll(),
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить категории', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-05 | Файл оформлен по коду с хоста и перенесён в структуру `docs/backend/admin/categories`. |