# api/places — исправленный PHP код

Дата: 2026-06-27

Файл собран по присланным endpoint-ам из папки `api/places/` и скринам структуры таблиц:

- `places`
- `categories`
- `place_types`
- `localities`
- `place_images`
- `place_attributes`
- `users`
- `attribute_definitions`
- `plans`

## Что поправлено в этих версиях

- Добавлена проверка значений фильтров `commercial`, `booking`, `category`, `type`, `locality`.
- Для списков опубликованных объектов добавлена единая проверка срока публикации: `p.expires_at IS NULL OR p.expires_at >= NOW()`.
- В `featured.php` добавлены поля локации, контактов, бронирования и даты, чтобы ответ был ближе к `index.php` / `map.php`.
- В `search.php` добавлена проверка `expires_at`, нормальная проверка `commercial` и поиск по `locality` как по `slug` или `id`.
- В `validate.php` добавлена проверка некорректного JSON.
- В публичных выдачах добавлена проверка оплаты: показываем `payment_status IS NULL`, `not_required` или `paid`; это нужно под будущие тарифы и Ю-Кассу.
- Запросы оставлены совместимыми с текущей структурой `places`, `categories`, `place_types`, `localities` на скринах.

---

## `api/places/create-options.php`

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

---

## `api/places/featured.php`

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->query("
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

            (
                SELECT pa.value
                FROM place_attributes pa
                INNER JOIN attribute_definitions ad
                    ON ad.id = pa.attribute_definition_id
                WHERE pa.place_id = p.id
                AND ad.code = 'price'
                LIMIT 1
            ) AS price,

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
        ORDER BY p.published_at DESC, p.created_at DESC, p.id DESC
        LIMIT 6
    ");

    successResponse([
        'places' => $stmt->fetchAll(),
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить рекомендуемые объекты', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

---

## `api/places/filters.php`

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

---

## `api/places/index.php`

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

---

## `api/places/map.php`

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

            (
                SELECT pa.value
                FROM place_attributes pa
                INNER JOIN attribute_definitions ad
                    ON ad.id = pa.attribute_definition_id
                WHERE pa.place_id = p.id
                AND ad.code = 'price'
                LIMIT 1
            ) AS price,

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

---

## `api/places/search.php`

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

$query = trim($_GET['q'] ?? '');
$category = trim($_GET['category'] ?? '');
$type = trim($_GET['type'] ?? '');
$commercial = trim($_GET['commercial'] ?? '');
$booking = trim($_GET['booking'] ?? '');
$locality = trim($_GET['locality'] ?? '');
$limit = (int) ($_GET['limit'] ?? 30);

if ($limit <= 0) {
    $limit = 30;
}

if ($limit > 60) {
    $limit = 60;
}

if ($query === '') {
    errorResponse('Пустой поисковый запрос', 400);
}

if (mb_strlen($query) < 2) {
    errorResponse('Поисковый запрос должен быть не короче 2 символов', 422);
}

if (mb_strlen($query) > 100) {
    $query = mb_substr($query, 0, 100);
}

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
            p.status,
            p.publication_type,
            p.payment_status,
            p.is_commercial,
            p.booking_type,
            p.booking_url,

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

    $params = [
        'query_title' => $searchValue,
        'query_short_description' => $searchValue,
        'query_full_description' => $searchValue,
        'query_address' => $searchValue,
        'query_locality_title' => $searchValue,
        'query_locality_slug' => $searchValue,
        'query_region_title' => $searchValue,
        'query_district_title' => $searchValue,
        'query_category_title' => $searchValue,
        'query_category_code' => $searchValue,
        'query_type_title' => $searchValue,
        'query_type_code' => $searchValue,
    ];

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

    $sql .= "
        ORDER BY p.published_at DESC, p.created_at DESC, p.id DESC
        LIMIT {$limit}
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    successResponse([
        'places' => $stmt->fetchAll(),
        'filters' => [
            'q' => $query,
            'category' => $category,
            'type' => $type,
            'commercial' => $commercial,
            'booking' => $booking,
            'locality' => $locality,
            'limit' => $limit,
        ],
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось выполнить поиск', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

---

## `api/places/types-by-category.php`

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

$category = trim($_GET['category'] ?? '');

if ($category === '') {
    errorResponse('Не передан код категории', 400);
}

if (!preg_match('/^[a-z0-9_-]+$/', $category)) {
    errorResponse('Некорректный код категории', 422);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
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
        WHERE c.code = :category
        AND c.is_active = 1
        AND pt.is_active = 1
        ORDER BY pt.sort_order ASC, pt.title ASC
    ");

    $stmt->execute([
        'category' => $category,
    ]);

    successResponse([
        'types' => $stmt->fetchAll(),
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить типы объектов', 500, [
        'error' => $e->getMessage(),
    ]);
}
```


---

## `api/places/show.php`

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

$slug = trim($_GET['slug'] ?? '');

if ($slug === '') {
    errorResponse('Не передан slug объекта', 400);
}

if (!preg_match('/^[a-z0-9_.-]+$/', $slug)) {
    errorResponse('Некорректный slug объекта', 422);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
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
            COALESCE(r.title, l.region) AS locality_region,
            COALESCE(d.title, l.district) AS locality_district,

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
        LEFT JOIN regions r ON r.id = l.region_id
        LEFT JOIN districts d ON d.id = l.district_id
        WHERE p.slug = :slug
        AND p.status = 'published'
        AND (p.expires_at IS NULL OR p.expires_at >= NOW())
        AND (p.payment_status IS NULL OR p.payment_status IN ('not_required', 'paid'))
        AND c.is_active = 1
        AND pt.is_active = 1
        LIMIT 1
    ");

    $stmt->execute([
        'slug' => $slug,
    ]);

    $place = $stmt->fetch();

    if (!$place) {
        errorResponse('Объект не найден', 404);
    }

    $imagesStmt = $pdo->prepare("
        SELECT
            id,
            image_path,
            sort_order,
            is_cover
        FROM place_images
        WHERE place_id = :place_id
        ORDER BY sort_order ASC, id ASC
    ");

    $imagesStmt->execute([
        'place_id' => $place['id'],
    ]);

    $attributesStmt = $pdo->prepare("
        SELECT
            ad.id AS attribute_definition_id,
            ad.code,
            ad.title,
            ad.field_type,
            ad.sort_order,
            pa.value
        FROM place_attributes pa
        INNER JOIN attribute_definitions ad ON ad.id = pa.attribute_definition_id
        WHERE pa.place_id = :place_id
        AND ad.is_active = 1
        AND pa.value IS NOT NULL
        AND pa.value != ''
        ORDER BY ad.sort_order ASC, ad.id ASC
    ");

    $attributesStmt->execute([
        'place_id' => $place['id'],
    ]);

    successResponse([
        'place' => $place,
        'images' => $imagesStmt->fetchAll(),
        'attributes' => $attributesStmt->fetchAll(),
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить объект', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## Важный нюанс по тарифам и Ю-Кассе

Сейчас в публичных endpoint-ах добавлена только безопасная проверка показа: опубликованное объявление должно быть не просрочено и иметь `payment_status` `not_required` или `paid`.

Полную логику оплаты не нужно зашивать в `api/places/show.php`, `index.php`, `map.php`, `search.php` и `featured.php`. Для Ю-Кассы лучше отдельный блок PHP endpoints:

```txt
api/payments/create.php
api/payments/yookassa-webhook.php
api/payments/status.php
```

И отдельная логика в создании/продлении объявления:

```txt
api/my-places/create.php
api/my-places/update.php
api/plans/index.php
```

Там нужно будет:

1. выбрать тариф из `plans`;
2. создать платеж в Ю-Кассе;
3. поставить объявлению `payment_status = 'unpaid'`;
4. после webhook от Ю-Кассы поставить `payment_status = 'paid'`;
5. выставить `published_at` и `expires_at` по `plans.duration_days`;
6. учитывать `plans.max_places` как лимит объявлений по тарифу.

---

## `api/places/validate.php`

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    errorResponse('Некорректный JSON', 400);
}

$title = trim($input['title'] ?? '');
$category = trim($input['category'] ?? '');
$type = trim($input['type'] ?? '');
$bookingType = trim($input['booking_type'] ?? '');
$publicationType = trim($input['publication_type'] ?? '');
$isCommercial = $input['is_commercial'] ?? null;

$errors = [];

if ($title === '') {
    $errors['title'] = 'Введите название объекта';
}

if ($category === '') {
    $errors['category'] = 'Выберите категорию';
} elseif (!preg_match('/^[a-z0-9_-]+$/', $category)) {
    $errors['category'] = 'Некорректная категория';
}

if ($type === '') {
    $errors['type'] = 'Выберите тип объекта';
} elseif (!preg_match('/^[a-z0-9_-]+$/', $type)) {
    $errors['type'] = 'Некорректный тип объекта';
}

if ($bookingType !== '' && !in_array($bookingType, ['chat', 'phone', 'external'], true)) {
    $errors['booking_type'] = 'Некорректный тип бронирования';
}

if ($publicationType !== '' && !in_array($publicationType, ['free', 'paid'], true)) {
    $errors['publication_type'] = 'Некорректный тип размещения';
}

if ($isCommercial !== null && !in_array((int) $isCommercial, [0, 1], true)) {
    $errors['is_commercial'] = 'Некорректный тип объекта';
}

if (!empty($errors)) {
    errorResponse('Обнаружены ошибки валидации', 422, [
        'errors' => $errors,
    ]);
}

successResponse([
    'message' => 'Проверка пройдена',
]);
```

# api/places — исправленный PHP код

Дата: 2026-06-27

Файл собран по присланным endpoint-ам из папки `api/places/` и скринам структуры таблиц:

- `places`
- `categories`
- `place_types`
- `localities`
- `place_images`
- `place_attributes`
- `users`
- `attribute_definitions`
- `plans`

## Что поправлено в этих версиях

- Добавлена проверка значений фильтров `commercial`, `booking`, `category`, `type`, `locality`.
- Для списков опубликованных объектов добавлена единая проверка срока публикации: `p.expires_at IS NULL OR p.expires_at >= NOW()`.
- В `featured.php` добавлены поля локации, контактов, бронирования и даты, чтобы ответ был ближе к `index.php` / `map.php`.
- В `search.php` добавлена проверка `expires_at`, нормальная проверка `commercial` и поиск по `locality` как по `slug` или `id`.
- В `validate.php` добавлена проверка некорректного JSON.
- В публичных выдачах добавлена проверка оплаты: показываем `payment_status IS NULL`, `not_required` или `paid`; это нужно под будущие тарифы и Ю-Кассу.
- Запросы оставлены совместимыми с текущей структурой `places`, `categories`, `place_types`, `localities` на скринах.

---

## `api/places/create-options.php`

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

---

## `api/places/featured.php`

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->query("
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
        ORDER BY p.published_at DESC, p.created_at DESC, p.id DESC
        LIMIT 6
    ");

    successResponse([
        'places' => $stmt->fetchAll(),
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить рекомендуемые объекты', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

---

## `api/places/filters.php`

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

---

## `api/places/index.php`

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

---

## `api/places/map.php`

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

---

## `api/places/search.php`

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

$query = trim($_GET['q'] ?? '');
$category = trim($_GET['category'] ?? '');
$type = trim($_GET['type'] ?? '');
$commercial = trim($_GET['commercial'] ?? '');
$booking = trim($_GET['booking'] ?? '');
$locality = trim($_GET['locality'] ?? '');
$limit = (int) ($_GET['limit'] ?? 30);

if ($limit <= 0) {
    $limit = 30;
}

if ($limit > 60) {
    $limit = 60;
}

if ($query === '') {
    errorResponse('Пустой поисковый запрос', 400);
}

if (mb_strlen($query) < 2) {
    errorResponse('Поисковый запрос должен быть не короче 2 символов', 422);
}

if (mb_strlen($query) > 100) {
    $query = mb_substr($query, 0, 100);
}

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
            p.status,
            p.publication_type,
            p.payment_status,
            p.is_commercial,
            p.booking_type,
            p.booking_url,

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

    $params = [
        'query_title' => $searchValue,
        'query_short_description' => $searchValue,
        'query_full_description' => $searchValue,
        'query_address' => $searchValue,
        'query_locality_title' => $searchValue,
        'query_locality_slug' => $searchValue,
        'query_region_title' => $searchValue,
        'query_district_title' => $searchValue,
        'query_category_title' => $searchValue,
        'query_category_code' => $searchValue,
        'query_type_title' => $searchValue,
        'query_type_code' => $searchValue,
    ];

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

    $sql .= "
        ORDER BY p.published_at DESC, p.created_at DESC, p.id DESC
        LIMIT {$limit}
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    successResponse([
        'places' => $stmt->fetchAll(),
        'filters' => [
            'q' => $query,
            'category' => $category,
            'type' => $type,
            'commercial' => $commercial,
            'booking' => $booking,
            'locality' => $locality,
            'limit' => $limit,
        ],
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось выполнить поиск', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

---

## `api/places/types-by-category.php`

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

$category = trim($_GET['category'] ?? '');

if ($category === '') {
    errorResponse('Не передан код категории', 400);
}

if (!preg_match('/^[a-z0-9_-]+$/', $category)) {
    errorResponse('Некорректный код категории', 422);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
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
        WHERE c.code = :category
        AND c.is_active = 1
        AND pt.is_active = 1
        ORDER BY pt.sort_order ASC, pt.title ASC
    ");

    $stmt->execute([
        'category' => $category,
    ]);

    successResponse([
        'types' => $stmt->fetchAll(),
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить типы объектов', 500, [
        'error' => $e->getMessage(),
    ]);
}
```


---

## `api/places/show.php`

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

$slug = trim($_GET['slug'] ?? '');

if ($slug === '') {
    errorResponse('Не передан slug объекта', 400);
}

if (!preg_match('/^[a-z0-9_-]+$/', $slug)) {
    errorResponse('Некорректный slug объекта', 422);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
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
            COALESCE(r.title, l.region) AS locality_region,
            COALESCE(d.title, l.district) AS locality_district,

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
        LEFT JOIN regions r ON r.id = l.region_id
        LEFT JOIN districts d ON d.id = l.district_id
        WHERE p.slug = :slug
        AND p.status = 'published'
        AND (p.expires_at IS NULL OR p.expires_at >= NOW())
        AND (p.payment_status IS NULL OR p.payment_status IN ('not_required', 'paid'))
        AND c.is_active = 1
        AND pt.is_active = 1
        LIMIT 1
    ");

    $stmt->execute([
        'slug' => $slug,
    ]);

    $place = $stmt->fetch();

    if (!$place) {
        errorResponse('Объект не найден', 404);
    }

    $imagesStmt = $pdo->prepare("
        SELECT
            id,
            image_path,
            sort_order,
            is_cover
        FROM place_images
        WHERE place_id = :place_id
        ORDER BY sort_order ASC, id ASC
    ");

    $imagesStmt->execute([
        'place_id' => $place['id'],
    ]);

    $attributesStmt = $pdo->prepare("
        SELECT
            ad.id AS attribute_definition_id,
            ad.code,
            ad.title,
            ad.field_type,
            ad.sort_order,
            pa.value
        FROM place_attributes pa
        INNER JOIN attribute_definitions ad ON ad.id = pa.attribute_definition_id
        WHERE pa.place_id = :place_id
        AND ad.is_active = 1
        AND pa.value IS NOT NULL
        AND pa.value != ''
        ORDER BY ad.sort_order ASC, ad.id ASC
    ");

    $attributesStmt->execute([
        'place_id' => $place['id'],
    ]);

    successResponse([
        'place' => $place,
        'images' => $imagesStmt->fetchAll(),
        'attributes' => $attributesStmt->fetchAll(),
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить объект', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## Важный нюанс по тарифам и Ю-Кассе

Сейчас в публичных endpoint-ах добавлена только безопасная проверка показа: опубликованное объявление должно быть не просрочено и иметь `payment_status` `not_required` или `paid`.

Полную логику оплаты не нужно зашивать в `api/places/show.php`, `index.php`, `map.php`, `search.php` и `featured.php`. Для Ю-Кассы лучше отдельный блок PHP endpoints:

```txt
api/payments/create.php
api/payments/yookassa-webhook.php
api/payments/status.php
```

И отдельная логика в создании/продлении объявления:

```txt
api/my-places/create.php
api/my-places/update.php
api/plans/index.php
```

Там нужно будет:

1. выбрать тариф из `plans`;
2. создать платеж в Ю-Кассе;
3. поставить объявлению `payment_status = 'unpaid'`;
4. после webhook от Ю-Кассы поставить `payment_status = 'paid'`;
5. выставить `published_at` и `expires_at` по `plans.duration_days`;
6. учитывать `plans.max_places` как лимит объявлений по тарифу.

---

## `api/places/validate.php`

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    errorResponse('Некорректный JSON', 400);
}

$title = trim($input['title'] ?? '');
$category = trim($input['category'] ?? '');
$type = trim($input['type'] ?? '');
$bookingType = trim($input['booking_type'] ?? '');
$publicationType = trim($input['publication_type'] ?? '');
$isCommercial = $input['is_commercial'] ?? null;

$errors = [];

if ($title === '') {
    $errors['title'] = 'Введите название объекта';
}

if ($category === '') {
    $errors['category'] = 'Выберите категорию';
} elseif (!preg_match('/^[a-z0-9_-]+$/', $category)) {
    $errors['category'] = 'Некорректная категория';
}

if ($type === '') {
    $errors['type'] = 'Выберите тип объекта';
} elseif (!preg_match('/^[a-z0-9_-]+$/', $type)) {
    $errors['type'] = 'Некорректный тип объекта';
}

if ($bookingType !== '' && !in_array($bookingType, ['chat', 'phone', 'external'], true)) {
    $errors['booking_type'] = 'Некорректный тип бронирования';
}

if ($publicationType !== '' && !in_array($publicationType, ['free', 'paid'], true)) {
    $errors['publication_type'] = 'Некорректный тип размещения';
}

if ($isCommercial !== null && !in_array((int) $isCommercial, [0, 1], true)) {
    $errors['is_commercial'] = 'Некорректный тип объекта';
}

if (!empty($errors)) {
    errorResponse('Обнаружены ошибки валидации', 422, [
        'errors' => $errors,
    ]);
}

successResponse([
    'message' => 'Проверка пройдена',
]);
```
