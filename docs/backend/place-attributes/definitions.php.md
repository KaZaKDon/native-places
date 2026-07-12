# api/place-attributes/definitions.php

## Статус

| Поле | Значение |
|---|---|
| Backend на хосте | да |
| Код сверено с хостом | да |
| Источник | `docs/API_FULL_TEXT.md` |
| Подключено на фронте | уточнить |
| Нужны правки backend | нет |
| Нужны правки frontend | уточнить |

## Назначение

Endpoint возвращает список активных характеристик для выбранной категории объекта.

Используется в форме создания/редактирования объекта, чтобы построить динамические поля характеристик.

## Метод и URL

```http
GET /api/place-attributes/definitions.php?category_id={id}
```

## Авторизация

Не требуется.

Endpoint публичный.

## Query params

| Параметр | Тип | Обязательный | Описание |
|---|---|---:|---|
| `category_id` | number | да | ID категории. |

## Success response

HTTP `200`

```json
{
  "success": true,
  "data": {
    "category_id": 1,
    "attributes": [
      {
        "id": 1,
        "category_id": 1,
        "code": "parking",
        "title": "Парковка",
        "field_type": "select",
        "reference_group_id": 2,
        "is_required": 0,
        "is_filterable": 1,
        "sort_order": 10,
        "reference_group_code": "yes_no",
        "reference_group_title": "Да/Нет"
      }
    ]
  }
}
```

## Response fields

| Поле | Тип | Описание |
|---|---|---|
| `id` | number | ID определения характеристики. |
| `category_id` | number | ID категории. |
| `code` | string | Код характеристики. |
| `title` | string | Название характеристики. |
| `field_type` | string | Тип поля. |
| `reference_group_id` | number/null | ID справочной группы, если используется. |
| `is_required` | number | Обязательная характеристика или нет. |
| `is_filterable` | number | Можно ли использовать в фильтрах. |
| `sort_order` | number | Порядок отображения. |
| `reference_group_code` | string/null | Код справочной группы. |
| `reference_group_title` | string/null | Название справочной группы. |

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `400` | `Не передан ID категории` | `category_id` отсутствует или меньше/равен нулю. |
| `500` | `Не удалось получить характеристики категории` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint использовать после выбора категории.
- На основе `field_type` строить нужный UI-контрол.
- Если есть `reference_group_id`, значения справочника нужно получать через reference-values endpoint.
- `is_required` можно использовать для frontend-валидации.
- `sort_order` использовать для порядка отображения полей.

## Backend notes

- Используются таблицы:
  - `attribute_definitions`;
  - `reference_groups`.
- Возвращаются только активные определения:
  - `ad.is_active = 1`.
- Сортировка:
  - `ad.sort_order ASC`;
  - `ad.id ASC`.

## PHP-код

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

$categoryId = (int) ($_GET['category_id'] ?? 0);

if ($categoryId <= 0) {
    errorResponse('Не передан ID категории', 400);
}

try {

    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
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

            rg.code AS reference_group_code,
            rg.title AS reference_group_title

        FROM attribute_definitions ad

        LEFT JOIN reference_groups rg
            ON rg.id = ad.reference_group_id

        WHERE ad.category_id = :category_id
        AND ad.is_active = 1

        ORDER BY ad.sort_order ASC, ad.id ASC
    ");

    $stmt->execute([
        'category_id' => $categoryId,
    ]);

    $attributes = $stmt->fetchAll();

    successResponse([
        'category_id' => $categoryId,
        'attributes' => $attributes,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось получить характеристики категории',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );

}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Документ структурирован из `docs/API_FULL_TEXT.md`. |