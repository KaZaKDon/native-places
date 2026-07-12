# api/admin/dictionaries/index.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Dictionaries |
| Тип | PHP endpoint |
| Авторизация | Требуется admin/moderator session |
| Middleware | `requireAdminOrModerator()` |
| Источник | `admin/docs/dphp_corrected_code_archive.md` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Возвращает список справочников и значений справочников для административной панели.

Endpoint отдаёт два массива:

- `groups` — группы справочников из `reference_groups`;
- `values` — значения справочников из `reference_values`.

Для групп дополнительно возвращаются счётчики:

- `values_count` — количество значений внутри справочника;
- `attributes_count` — количество атрибутов, связанных со справочником через `attribute_definitions.reference_group_id`.

## Метод и URL

```http
GET /api/admin/dictionaries/index.php
```

## Авторизация

Требуется административная или модераторская сессия.

Проверка выполняется через:

```php
requireAdminOrModerator();
```

Это значит, что endpoint доступен не только администратору, но и модератору.

## Request

Тело запроса не требуется.

## Success response

```json
{
  "success": true,
  "groups": [
    {
      "id": 1,
      "code": "amenities",
      "title": "Удобства",
      "description": "Список удобств",
      "sort_order": 1,
      "is_active": 1,
      "created_at": "2026-06-27 12:00:00",
      "updated_at": "2026-06-27 12:00:00",
      "values_count": 5,
      "attributes_count": 2
    }
  ],
  "values": [
    {
      "id": 10,
      "group_id": 1,
      "code": "wifi",
      "title": "Wi-Fi",
      "sort_order": 1,
      "is_active": 1,
      "created_at": "2026-06-27 12:00:00",
      "updated_at": "2026-06-27 12:00:00",
      "group_code": "amenities",
      "group_title": "Удобства"
    }
  ]
}
```

## Структура `groups[]`

| Поле | Тип | Описание |
|---|---:|---|
| `id` | number | ID справочника |
| `code` | string | Код справочника |
| `title` | string | Название справочника |
| `description` | string/null | Описание |
| `sort_order` | number | Порядок сортировки |
| `is_active` | number | Активность справочника |
| `created_at` | string | Дата создания |
| `updated_at` | string | Дата обновления |
| `values_count` | number | Количество значений справочника |
| `attributes_count` | number | Количество связанных атрибутов |

## Структура `values[]`

| Поле | Тип | Описание |
|---|---:|---|
| `id` | number | ID значения |
| `group_id` | number | ID справочника |
| `code` | string | Код значения |
| `title` | string | Название значения |
| `sort_order` | number | Порядок сортировки |
| `is_active` | number | Активность значения |
| `created_at` | string | Дата создания |
| `updated_at` | string | Дата обновления |
| `group_code` | string | Код родительского справочника |
| `group_title` | string | Название родительского справочника |

## Error responses

### 401 / 403 — нет доступа

Формируется в `requireAdminOrModerator()`.

Точный формат зависит от реализации `api/admin/shared/require-admin.php`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось получить справочники",
  "error": "..."
}
```

## Frontend notes

- Используется для страницы справочников в админке.
- `groups` можно показывать как левый список или секции.
- `values` можно группировать на frontend по `group_id`.
- Сортировка уже выполнена backend-ом.
- Endpoint возвращает и активные, и неактивные справочники/значения.
- Так как endpoint доступен модератору, frontend может использовать его и в модераторском интерфейсе, если права позволяют.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdminOrModerator()`.
- Подключение к базе фактически приходит через `require-admin.php`.
- Для групп используются две агрегированные подвыборки:
  - количество значений из `reference_values`;
  - количество связанных атрибутов из `attribute_definitions`.
- Для значений используется join с `reference_groups`.
- Endpoint не принимает фильтры и не использует пагинацию.

## PHP-код

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdminOrModerator();

try {
    $pdo = getDatabaseConnection();

    $groupsStmt = $pdo->query("
        SELECT
            rg.id,
            rg.code,
            rg.title,
            rg.description,
            rg.sort_order,
            rg.is_active,
            rg.created_at,
            rg.updated_at,
            COALESCE(rv_counts.values_count, 0) AS values_count,
            COALESCE(ad_counts.attributes_count, 0) AS attributes_count
        FROM reference_groups rg
        LEFT JOIN (
            SELECT
                group_id,
                COUNT(*) AS values_count
            FROM reference_values
            GROUP BY group_id
        ) rv_counts
            ON rv_counts.group_id = rg.id
        LEFT JOIN (
            SELECT
                reference_group_id,
                COUNT(*) AS attributes_count
            FROM attribute_definitions
            WHERE reference_group_id IS NOT NULL
            GROUP BY reference_group_id
        ) ad_counts
            ON ad_counts.reference_group_id = rg.id
        ORDER BY
            rg.sort_order ASC,
            rg.id ASC
    ");

    $valuesStmt = $pdo->query("
        SELECT
            rv.id,
            rv.group_id,
            rv.code,
            rv.title,
            rv.sort_order,
            rv.is_active,
            rv.created_at,
            rv.updated_at,
            rg.code AS group_code,
            rg.title AS group_title
        FROM reference_values rv
        INNER JOIN reference_groups rg
            ON rg.id = rv.group_id
        ORDER BY
            rg.sort_order ASC,
            rg.id ASC,
            rv.sort_order ASC,
            rv.id ASC
    ");

    successResponse([
        'groups' => $groupsStmt->fetchAll(),
        'values' => $valuesStmt->fetchAll(),
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить справочники', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Файл перенесён в новую структуру документации `docs/backend/admin/dictionaries`. |