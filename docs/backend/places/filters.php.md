# api/places/filters.php

## Статус

| Поле | Значение |
|---|---|
| Backend на хосте | да |
| Код сверено с хостом | да |
| Источник | `php-after-changes/api-places-updated.md` |
| Подключено на фронте | уточнить |
| Нужны правки backend | нет |
| Нужны правки frontend | уточнить |

## Назначение

Endpoint возвращает данные для публичных фильтров каталога объектов.

В отличие от `create-options.php`, этот endpoint не возвращает тарифы. Он предназначен именно для фильтрации публичного списка/карты.

## Метод и URL

```http
GET /api/places/filters.php
```

## Авторизация

Не требуется.

Endpoint публичный.

## Request

Тело запроса не требуется.

Query-параметры не используются.

## Success response

HTTP `200`

```json
{
  "success": true,
  "data": {
    "categories": [],
    "types": [],
    "publication_types": [
      {
        "value": "free",
        "title": "Бесплатное размещение"
      },
      {
        "value": "paid",
        "title": "Платное размещение"
      }
    ],
    "booking_types": [
      {
        "value": "chat",
        "title": "Чат"
      },
      {
        "value": "phone",
        "title": "Телефон"
      },
      {
        "value": "external",
        "title": "Внешняя ссылка"
      }
    ],
    "commercial_options": [
      {
        "value": 0,
        "title": "Частный объект"
      },
      {
        "value": 1,
        "title": "Коммерческий объект"
      }
    ]
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `500` | `Не удалось получить фильтры объектов` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint использовать для страницы каталога, поиска и карты.
- `categories` использовать для основного фильтра категории.
- `types` можно фильтровать на фронте по `category_id`.
- `publication_types` использовать для фильтра типа размещения.
- `booking_types` использовать для фильтра бронирования.
- `commercial_options` использовать для переключателя частный/коммерческий.
- Для формы создания объекта лучше использовать `api/places/create-options.php`, потому что там дополнительно возвращаются тарифы.

## Backend notes

- Используются таблицы:
  - `categories`;
  - `place_types`.
- Возвращаются только активные категории.
- Возвращаются только активные типы, у которых активна категория.
- Тарифы в этом endpoint-е не возвращаются.

## PHP-код

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

try {
    $pdo = getDatabaseConnection();

    $categoriesStmt = $pdo->query("
        SELECT
            id,
            code,
            title,
            description,
            icon,
            color,
            sort_order
        FROM categories
        WHERE is_active = 1
        ORDER BY sort_order ASC, id ASC
    ");

    $typesStmt = $pdo->query("
        SELECT
            pt.id,
            pt.category_id,
            pt.code,
            pt.title,
            pt.sort_order,
            c.code AS category_code,
            c.title AS category_title
        FROM place_types pt
        INNER JOIN categories c ON c.id = pt.category_id
        WHERE pt.is_active = 1
        AND c.is_active = 1
        ORDER BY c.sort_order ASC, pt.sort_order ASC, pt.title ASC
    ");

    successResponse([
        'categories' => $categoriesStmt->fetchAll(),
        'types' => $typesStmt->fetchAll(),
        'publication_types' => [
            [
                'value' => 'free',
                'title' => 'Бесплатное размещение',
            ],
            [
                'value' => 'paid',
                'title' => 'Платное размещение',
            ],
        ],
        'booking_types' => [
            [
                'value' => 'chat',
                'title' => 'Чат',
            ],
            [
                'value' => 'phone',
                'title' => 'Телефон',
            ],
            [
                'value' => 'external',
                'title' => 'Внешняя ссылка',
            ],
        ],
        'commercial_options' => [
            [
                'value' => 0,
                'title' => 'Частный объект',
            ],
            [
                'value' => 1,
                'title' => 'Коммерческий объект',
            ],
        ],
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить фильтры объектов', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Документ структурирован из `php-after-changes/api-places-updated.md`. |