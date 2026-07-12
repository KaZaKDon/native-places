# api/places/index.php

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

Endpoint возвращает публичный список опубликованных объектов.

Поддерживает фильтры:

- категория;
- тип объекта;
- коммерческий/частный объект;
- тип бронирования;
- населённый пункт;
- поисковая строка.

В публичный список попадают только объекты, которые:

- опубликованы;
- не просрочены;
- не ожидают оплаты;
- относятся к активной категории;
- относятся к активному типу.

## Метод и URL

```http
GET /api/places/index.php
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
| `500` | `Не удалось получить объекты` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint использовать для основной страницы каталога.
- Для карты лучше использовать `api/places/map.php`, потому что там дополнительно отфильтрованы объекты без координат.
- Фильтры из ответа можно использовать для восстановления состояния UI.
- Если `places` пустой, показать empty state.
- Для перехода в карточку объекта использовать `slug`.

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
- `locality` можно передать как slug или ID.
- Поиск `q` ищет по названию, описаниям, адресу, локации, региону, району, категории и типу.

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
            p.published_at DESC,
            p.created_at DESC,
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
    errorResponse('Не удалось получить объекты', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Документ структурирован из `php-after-changes/api-places-updated.md`. |