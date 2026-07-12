# api/admin/attributes/index.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Attributes |
| Тип | PHP endpoint |
| Авторизация | Требуется admin/moderator session |
| Middleware | `requireAdminOrModerator()` |
| Источник | Код с хоста `api/admin/attributes/index.php` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Возвращает список характеристик для административной панели.

Дополнительно возвращает:

- активные категории;
- активные справочники;
- список доступных типов полей.

## Метод и URL

```http
GET /api/admin/attributes/index.php
```

## Авторизация

Требуется административная или модераторская сессия.

Проверка выполняется через:

```php
requireAdminOrModerator();
```

Endpoint доступен администратору и модератору.

## Request

Тело запроса не требуется.

Query-параметров в текущей реализации нет.

## Success response

```json
{
  "success": true,
  "attributes": [
    {
      "id": 10,
      "category_id": 1,
      "code": "wifi",
      "title": "Wi-Fi",
      "field_type": "boolean",
      "reference_group_id": null,
      "is_required": 0,
      "is_filterable": 1,
      "sort_order": 10,
      "is_active": 1,
      "created_at": "2026-07-05 12:00:00",
      "updated_at": "2026-07-05 12:00:00",
      "category_code": "food",
      "category_title": "Еда",
      "reference_group_code": null,
      "reference_group_title": null
    }
  ],
  "categories": [
    {
      "id": 1,
      "code": "food",
      "title": "Еда"
    }
  ],
  "reference_groups": [
    {
      "id": 1,
      "code": "amenities",
      "title": "Удобства"
    }
  ],
  "field_types": [
    {
      "value": "text",
      "title": "Текст"
    },
    {
      "value": "textarea",
      "title": "Большой текст"
    },
    {
      "value": "number",
      "title": "Число"
    },
    {
      "value": "boolean",
      "title": "Да / Нет"
    },
    {
      "value": "select",
      "title": "Выбор одного"
    }
  ]
}
```

## Структура `attributes[]`

| Поле | Тип | Описание |
|---|---:|---|
| `id` | number | ID характеристики |
| `category_id` | number | ID категории |
| `code` | string | Ключ характеристики |
| `title` | string | Название характеристики |
| `field_type` | string | Тип поля |
| `reference_group_id` | number/null | ID справочника |
| `is_required` | number | Обязательность |
| `is_filterable` | number | Используется в фильтрах |
| `sort_order` | number | Порядок сортировки |
| `is_active` | number | Активность |
| `created_at` | string | Дата создания |
| `updated_at` | string/null | Дата обновления |
| `category_code` | string | Код категории |
| `category_title` | string | Название категории |
| `reference_group_code` | string/null | Код справочника |
| `reference_group_title` | string/null | Название справочника |

## `categories[]`

Список активных категорий для формы создания/редактирования.

```sql
WHERE is_active = 1
```

## `reference_groups[]`

Список активных справочников для характеристик типа `select`.

```sql
WHERE is_active = 1
```

## `field_types[]`

Список доступных типов поля:

| `value` | `title` |
|---|---|
| `text` | Текст |
| `textarea` | Большой текст |
| `number` | Число |
| `boolean` | Да / Нет |
| `select` | Выбор одного |

## Сортировка

### Характеристики

```sql
ORDER BY c.sort_order ASC, ad.sort_order ASC, ad.id ASC
```

### Категории

```sql
ORDER BY sort_order ASC, id ASC
```

### Справочники

```sql
ORDER BY sort_order ASC, id ASC
```

## Error responses

### 401 / 403 — нет доступа

Формируется в `requireAdminOrModerator()`.

Точный формат зависит от реализации `api/admin/shared/require-admin.php`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось получить характеристики",
  "error": "..."
}
```

## Frontend notes

- Используется для страницы характеристик в админке.
- `categories` использовать для селекта категории.
- `reference_groups` использовать для селекта справочника.
- `field_types` использовать для селекта типа поля.
- Для `field_type = select` обычно нужен `reference_group_id`.
- Для создания характеристики использовать `create.php`.
- Для обновления характеристики использовать `update.php`.
- Для удаления характеристики использовать `delete.php`.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdminOrModerator()`.
- Подключение к базе фактически приходит через `require-admin.php`.
- Характеристики берутся из `attribute_definitions`.
- Категории подтягиваются через `categories`.
- Справочники подтягиваются через `reference_groups`.
- Endpoint не пишет moderator-log, потому что только читает данные.

## PHP-код

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdminOrModerator();

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->query("
        SELECT
            ad.id,
            ad.category_id,
            ad.code,
            ad.title,
            ad.field_type,
            ad.reference_group_id,
            ad.is_required,
            ad.is_filterable,
            ad.sort_order,
            ad.is_active,
            ad.created_at,
            ad.updated_at,

            c.code AS category_code,
            c.title AS category_title,

            rg.code AS reference_group_code,
            rg.title AS reference_group_title
        FROM attribute_definitions ad
        INNER JOIN categories c
            ON c.id = ad.category_id
        LEFT JOIN reference_groups rg
            ON rg.id = ad.reference_group_id
        ORDER BY c.sort_order ASC, ad.sort_order ASC, ad.id ASC
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

    $referenceGroupsStmt = $pdo->query("
        SELECT
            id,
            code,
            title
        FROM reference_groups
        WHERE is_active = 1
        ORDER BY sort_order ASC, id ASC
    ");

    successResponse([
        'attributes' => $stmt->fetchAll(),
        'categories' => $categoriesStmt->fetchAll(),
        'reference_groups' => $referenceGroupsStmt->fetchAll(),
        'field_types' => [
            ['value' => 'text', 'title' => 'Текст'],
            ['value' => 'textarea', 'title' => 'Большой текст'],
            ['value' => 'number', 'title' => 'Число'],
            ['value' => 'boolean', 'title' => 'Да / Нет'],
            ['value' => 'select', 'title' => 'Выбор одного'],
        ],
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить характеристики', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-05 | Файл оформлен по коду с хоста и перенесён в структуру `docs/backend/admin/attributes`. |