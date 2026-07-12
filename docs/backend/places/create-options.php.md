# api/places/create-options.php

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

Endpoint возвращает данные для формы создания объекта.

В ответе приходят:

- активные категории;
- активные типы объектов;
- активные тарифы;
- варианты типа размещения;
- варианты бронирования;
- варианты коммерческого/частного объекта.

## Метод и URL

```http
GET /api/places/create-options.php
```

## Авторизация

Не требуется.

Endpoint публичный, но обычно используется внутри формы создания объекта. Сама отправка объекта выполняется через защищённый endpoint `api/my-places/create.php`.

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
    "plans": [],
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

## Response fields

### `categories`

Активные категории из таблицы `categories`.

| Поле | Тип | Описание |
|---|---|---|
| `id` | number | ID категории. |
| `code` | string | Код категории. |
| `title` | string | Название категории. |
| `description` | string/null | Описание. |
| `icon` | string/null | Иконка. |
| `color` | string/null | Цвет. |
| `sort_order` | number | Порядок сортировки. |

### `types`

Активные типы объектов из таблицы `place_types`.

| Поле | Тип | Описание |
|---|---|---|
| `id` | number | ID типа. |
| `category_id` | number | ID категории. |
| `code` | string | Код типа. |
| `title` | string | Название типа. |
| `sort_order` | number | Порядок сортировки. |
| `category_code` | string | Код категории. |
| `category_title` | string | Название категории. |

### `plans`

Активные тарифы из таблицы `plans`.

| Поле | Тип | Описание |
|---|---|---|
| `id` | number | ID тарифа. |
| `code` | string | Код тарифа. |
| `title` | string | Название тарифа. |
| `description` | string/null | Описание тарифа. |
| `max_places` | number | Лимит объявлений. |
| `duration_days` | number/null | Срок действия тарифа. |
| `price` | number | Цена. |

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `500` | `Не удалось получить данные для формы создания объекта` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint удобно вызывать перед открытием формы создания объекта.
- `categories` использовать для выбора категории.
- `types` можно фильтровать на фронте по `category_id`.
- `plans` использовать для выбора тарифа.
- `publication_types`, `booking_types`, `commercial_options` можно использовать как готовые enum-списки.
- Если нужен только публичный фильтр каталога без тарифов, лучше использовать `api/places/filters.php`.

## Backend notes

- Используются таблицы:
  - `categories`;
  - `place_types`;
  - `plans`.
- Возвращаются только активные категории:
  - `categories.is_active = 1`.
- Возвращаются только активные типы, у которых активна категория:
  - `place_types.is_active = 1`;
  - `categories.is_active = 1`.
- Возвращаются только активные тарифы:
  - `plans.is_active = 1`.

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

    $plansStmt = $pdo->query("
        SELECT
            id,
            code,
            title,
            description,
            max_places,
            duration_days,
            price
        FROM plans
        WHERE is_active = 1
        ORDER BY id ASC
    ");

    successResponse([
        'categories' => $categoriesStmt->fetchAll(),
        'types' => $typesStmt->fetchAll(),
        'plans' => $plansStmt->fetchAll(),
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
    errorResponse('Не удалось получить данные для формы создания объекта', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Документ структурирован из `php-after-changes/api-places-updated.md`. |