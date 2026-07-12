# api/admin/place-types/index.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Place Types |
| Тип | PHP endpoint |
| Авторизация | Требуется admin session |
| Middleware | `requireAdmin()` |
| Источник | Код с хоста `api/admin/place-types/index.php` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Возвращает список типов объектов для административной панели.

Дополнительно возвращает список активных категорий, чтобы frontend мог использовать их в форме создания/редактирования типа.

## Метод и URL

```http
GET /api/admin/place-types/index.php
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
  "types": [
    {
      "id": 5,
      "category_id": 1,
      "code": "restaurant",
      "title": "Ресторан",
      "sort_order": 10,
      "is_active": 1,
      "created_at": "2026-07-05 12:00:00",
      "updated_at": "2026-07-05 12:00:00",
      "category_code": "food",
      "category_title": "Еда",
      "places_count": 12
    }
  ],
  "categories": [
    {
      "id": 1,
      "code": "food",
      "title": "Еда"
    }
  ]
}
```

## Структура `types[]`

| Поле | Тип | Описание |
|---|---:|---|
| `id` | number | ID типа объекта |
| `category_id` | number | ID категории |
| `code` | string | Код типа |
| `title` | string | Название типа |
| `sort_order` | number | Порядок сортировки |
| `is_active` | number | Активность |
| `created_at` | string | Дата создания |
| `updated_at` | string/null | Дата обновления |
| `category_code` | string | Код категории |
| `category_title` | string | Название категории |
| `places_count` | number | Количество объявлений этого типа |

## Структура `categories[]`

| Поле | Тип | Описание |
|---|---:|---|
| `id` | number | ID категории |
| `code` | string | Код категории |
| `title` | string | Название категории |

В `categories[]` попадают только активные категории:

```sql
WHERE is_active = 1
```

## Сортировка

### Типы объектов

```sql
ORDER BY c.sort_order ASC, pt.sort_order ASC, pt.id ASC
```

### Категории

```sql
ORDER BY sort_order ASC, id ASC
```

## Как считается `places_count`

```sql
SELECT
    place_type_id,
    COUNT(*) AS places_count
FROM places
GROUP BY place_type_id
```

Учитываются все объявления с этим типом без фильтра по статусу.

## Error responses

### 401 / 403 — нет доступа

Формируется в `requireAdmin()`.

Точный формат зависит от реализации `api/admin/shared/require-admin.php`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось получить типы объектов",
  "error": "..."
}
```

## Frontend notes

- Используется для таблицы типов объектов в админке.
- `categories` удобно использовать для селекта категории.
- В селект попадают только активные категории.
- `places_count` можно показывать в таблице типов.
- Для создания типа использовать `create.php`.
- Для редактирования типа использовать `update.php`.
- Для включения/отключения типа использовать `toggle-active.php`.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdmin()`.
- Подключение к базе фактически приходит через `require-admin.php`.
- Данные типов берутся из `place_types`.
- Категории подтягиваются через `INNER JOIN categories`.
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
            pt.id,
            pt.category_id,
            pt.code,
            pt.title,
            pt.sort_order,
            pt.is_active,
            pt.created_at,
            pt.updated_at,

            c.code AS category_code,
            c.title AS category_title,

            COALESCE(pc.places_count, 0) AS places_count
        FROM place_types pt
        INNER JOIN categories c
            ON c.id = pt.category_id
        LEFT JOIN (
            SELECT
                place_type_id,
                COUNT(*) AS places_count
            FROM places
            GROUP BY place_type_id
        ) pc
            ON pc.place_type_id = pt.id
        ORDER BY c.sort_order ASC, pt.sort_order ASC, pt.id ASC
    ");

    $categoriesStmt = $pdo->query("
        SELECT
            id,
            code,
            title
        FROM categories
        WHERE is_active = 1
        ORDER BY sort_order ASC, id ASC
    ");

    successResponse([
        'types' => $stmt->fetchAll(),
        'categories' => $categoriesStmt->fetchAll(),
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить типы объектов', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-05 | Файл оформлен по коду с хоста и перенесён в структуру `docs/backend/admin/place-types`. |