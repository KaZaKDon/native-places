# api/places/map.php

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

Endpoint возвращает публичные объекты для отображения на карте.

Логика похожа на `api/places/index.php`, но дополнительно исключает объекты без координат или с координатами `0,0`.

## Метод и URL

```http
GET /api/places/map.php
```

## Query params

| Параметр | Тип | Обязательный | Описание |
|---|---|---:|---|
| `category` | string | нет | Код категории. |
| `type` | string | нет | Код типа объекта. |
| `commercial` | number/string | нет | `0` или `1`. |
| `booking` | string | нет | `chat`, `phone`, `external`. |
| `locality` | string/number | нет | Slug или ID населённого пункта. |
| `q` | string | нет | Поисковая строка. |

## Success response

HTTP `200`

```json
{
  "success": true,
  "data": {
    "places": [],
    "filters": {
      "category": "",
      "type": "",
      "commercial": "",
      "booking": "",
      "locality": "",
      "q": ""
    }
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `422` | `Некорректный код категории` | `category` содержит недопустимые символы. |
| `422` | `Некорректный код типа объекта` | `type` содержит недопустимые символы. |
| `422` | `Некорректный тип бронирования` | `booking` не входит в разрешённый список. |
| `422` | `Некорректный населённый пункт` | `locality` содержит недопустимые символы. |
| `422` | `Некорректный фильтр коммерческих объектов` | `commercial` не равен `0` или `1`. |
| `500` | `Не удалось получить объекты для карты` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint использовать для карты.
- В ответ не попадают объекты без координат.
- В ответ не попадают объекты с координатами `0,0`.
- Для маркеров использовать:
  - `id`;
  - `title`;
  - `slug`;
  - `latitude`;
  - `longitude`;
  - `category_icon`;
  - `category_color`.
- Для popup карточки использовать:
  - `cover_image`;
  - `short_description`;
  - `address`;
  - `locality_title`;
  - `type_title`.
- Фильтры аналогичны `api/places/index.php`.

## Backend notes

- Используются таблицы:
  - `places`;
  - `categories`;
  - `place_types`;
  - `localities`.
- Базовые условия публичной выдачи:
  - `p.status = 'published'`;
  - `p.expires_at IS NULL OR p.expires_at >= NOW()`;
  - `p.payment_status IS NULL OR p.payment_status IN ('not_required', 'paid')`;
  - `c.is_active = 1`;
  - `pt.is_active = 1`.
- Дополнительные условия карты:
  - `p.latitude IS NOT NULL`;
  - `p.longitude IS NOT NULL`;
  - `NOT (p.latitude = 0 AND p.longitude = 0)`.
- Сортировка:
  - `c.sort_order ASC`;
  - `p.published_at DESC`;
  - `p.title ASC`;
  - `p.id DESC`.

## PHP-код

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

$category = trim($_GET['category'] ?? '');
$type = trim($_GET['type'] ?? '');
$commercial = trim($_GET['commercial'] ?? '');
$booking = trim($_GET['booking'] ?? '');
$query = trim($_GET['q'] ?? '');
$locality = trim($_GET['locality'] ?? '');

if ($category !== '' && !preg_match('/^[a-z0-9_-]+$/', $category)) {
    errorResponse('Некорректный код категории', 422);
}

if ($type !== '' && !preg_match('/^[a-z0-9_-]+$/', $type)) {
    errorResponse('Некорректный код типа объекта', 422);
}

if ($booking !== '' && !in_array($booking, ['chat', 'phone', 'external'], true)) {
    errorResponse('Некорректный тип бронирования', 422);
}

if ($locality !== '' && !preg_match('/^[a-z0-9_-]+$/', $locality) && !ctype_digit($locality)) {
    errorResponse('Некорректный населённый пункт', 422);
}

try {
    $pdo = getDatabaseConnection();

    $sql = "
        SELECT
            p.id,
            p.title,
            p.slug,
            p.short_description,
            p.full_description,
            p.cover_image,
            p.address,
            p.latitude,
            p.longitude,
            p.contact_name,
            p.phone,
            p.telegram,
            p.email,
            p.website,
            p.status,
            p.publication_type,
            p.payment_status,
            p.is_commercial,
            p.booking_type,
            p.booking_url,
            p.created_at,
            p.updated_at,

            p.locality_id,
            l.title AS locality_title,
            l.slug AS locality_slug,
            l.region AS locality_region,
            l.district AS locality_district,

            c.code AS category_code,
            c.title AS category_title,
            c.icon AS category_icon,
            c.color AS category_color,

            pt.code AS type_code,
            pt.title AS type_title

        FROM places p
        INNER JOIN categories c ON c.id = p.category_id
        INNER JOIN place_types pt ON pt.id = p.place_type_id
        LEFT JOIN localities l ON l.id = p.locality_id
        WHERE p.status = 'published'
        AND (p.expires_at IS NULL OR p.expires_at >= NOW())
        AND (p.payment_status IS NULL OR p.payment_status IN ('not_required', 'paid'))
        AND c.is_active = 1
        AND pt.is_active = 1
        AND p.latitude IS NOT NULL
        AND p.longitude IS NOT NULL
        AND NOT (p.latitude = 0 AND p.longitude = 0)
    ";

    $params = [];

    if ($category !== '') {
        $sql .= " AND c.code = :category";
        $params['category'] = $category;
    }

    if ($type !== '') {
        $sql .= " AND pt.code = :type";
        $params['type'] = $type;
    }

    if ($commercial !== '') {
        $commercialValue = (int) $commercial;

        if ($commercialValue !== 0 && $commercialValue !== 1) {
            errorResponse('Некорректный фильтр коммерческих объектов', 422);
        }

        $sql .= " AND p.is_commercial = :commercial";
        $params['commercial'] = $commercialValue;
    }

    if ($booking !== '') {
        $sql .= " AND p.booking_type = :booking";
        $params['booking'] = $booking;
    }

    if ($locality !== '') {
        $sql .= "
            AND (
                l.slug = :locality_slug
                OR l.id = :locality_id
            )
        ";

        $params['locality_slug'] = $locality;
        $params['locality_id'] = ctype_digit($locality) ? (int) $locality : 0;
    }

    if ($query !== '') {
        $sql .= "
            AND (
                p.title LIKE :query_title
                OR p.short_description LIKE :query_short_description
                OR p.full_description LIKE :query_full_description
                OR p.address LIKE :query_address
                OR l.title LIKE :query_locality_title
                OR l.slug LIKE :query_locality_slug
                OR l.region LIKE :query_region_title
                OR l.district LIKE :query_district_title
                OR c.title LIKE :query_category_title
                OR c.code LIKE :query_category_code
                OR pt.title LIKE :query_type_title
                OR pt.code LIKE :query_type_code
            )
        ";

        $searchValue = '%' . $query . '%';

        $params['query_title'] = $searchValue;
        $params['query_short_description'] = $searchValue;
        $params['query_full_description'] = $searchValue;
        $params['query_address'] = $searchValue;
        $params['query_locality_title'] = $searchValue;
        $params['query_locality_slug'] = $searchValue;
        $params['query_region_title'] = $searchValue;
        $params['query_district_title'] = $searchValue;
        $params['query_category_title'] = $searchValue;
        $params['query_category_code'] = $searchValue;
        $params['query_type_title'] = $searchValue;
        $params['query_type_code'] = $searchValue;
    }

    $sql .= "
        ORDER BY
            c.sort_order ASC,
            p.published_at DESC,
            p.title ASC,
            p.id DESC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    successResponse([
        'places' => $stmt->fetchAll(),
        'filters' => [
            'category' => $category,
            'type' => $type,
            'commercial' => $commercial,
            'booking' => $booking,
            'locality' => $locality,
            'q' => $query,
        ],
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить объекты для карты', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Документ структурирован из `php-after-changes/api-places-updated.md`. |