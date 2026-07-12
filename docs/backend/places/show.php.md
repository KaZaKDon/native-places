# api/places/show.php

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

Endpoint возвращает публичную карточку объекта по `slug`.

В ответе возвращаются:

- основные данные объекта;
- изображения;
- дополнительные атрибуты.

В публичной выдаче объект доступен только если он:

- опубликован;
- не просрочен;
- не ожидает оплаты;
- относится к активной категории;
- относится к активному типу.

## Метод и URL

```http
GET /api/places/show.php?slug={slug}
```

## Авторизация

Не требуется.

Endpoint публичный.

## Query params

| Параметр | Тип | Обязательный | Правила |
|---|---|---:|---|
| `slug` | string | да | Slug объекта. Допустимы только `a-z`, `0-9`, `_`, `-`. |

## Success response

HTTP `200`

```json
{
  "success": true,
  "data": {
    "place": {
      "id": 1,
      "title": "Название объекта",
      "slug": "place-slug",
      "short_description": "Краткое описание",
      "full_description": "Полное описание",
      "cover_image": "/path/to/image.jpg",
      "address": "Адрес",
      "latitude": "47.222",
      "longitude": "39.718",
      "contact_name": "Имя",
      "phone": "+79990000000",
      "telegram": "@username",
      "email": "user@example.com",
      "website": "https://example.com",
      "status": "published",
      "publication_type": "free",
      "payment_status": "not_required",
      "is_commercial": 0,
      "booking_type": "phone",
      "booking_url": null,
      "created_at": "2026-07-04 09:00:00",
      "updated_at": "2026-07-04 10:00:00",
      "locality_id": 1,
      "locality_title": "Ростов-на-Дону",
      "locality_slug": "rostov-na-donu",
      "locality_region": "Ростовская область",
      "locality_district": null,
      "category_code": "museum",
      "category_title": "Музеи",
      "category_icon": "museum",
      "category_color": "#000000",
      "type_code": "place",
      "type_title": "Место"
    },
    "images": [
      {
        "id": 1,
        "image_path": "/path/to/image.jpg",
        "sort_order": 1,
        "is_cover": 1
      }
    ],
    "attributes": [
      {
        "attribute_definition_id": 1,
        "code": "attribute_code",
        "title": "Название атрибута",
        "field_type": "text",
        "sort_order": 1,
        "value": "Значение"
      }
    ]
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `400` | `Не передан slug объекта` | Query-параметр `slug` отсутствует или пустой. |
| `422` | `Некорректный slug объекта` | Slug содержит недопустимые символы. |
| `404` | `Объект не найден` | Объект не найден или не должен показываться публично. |
| `500` | `Не удалось получить объект` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint используется на публичной странице объекта.
- Для URL страницы обычно используется `slug`.
- Если backend вернул `404`, показать страницу «Объект не найден».
- `place` содержит основные данные карточки.
- `images` использовать для галереи.
- `attributes` использовать для блока характеристик.
- Атрибуты без значения в публичный ответ не попадают.
- Контакты и бронирование можно показывать из:
  - `contact_name`;
  - `phone`;
  - `telegram`;
  - `email`;
  - `website`;
  - `booking_type`;
  - `booking_url`.
- Для карты использовать `latitude` и `longitude`.

## Backend notes

- Используются таблицы:
  - `places`;
  - `categories`;
  - `place_types`;
  - `localities`;
  - `regions`;
  - `districts`;
  - `place_images`;
  - `place_attributes`;
  - `attribute_definitions`.
- Объект выбирается только если:
  - `p.slug = :slug`;
  - `p.status = 'published'`;
  - `p.expires_at IS NULL OR p.expires_at >= NOW()`;
  - `p.payment_status IS NULL OR p.payment_status IN ('not_required', 'paid')`;
  - `c.is_active = 1`;
  - `pt.is_active = 1`.
- Изображения сортируются по:
  - `sort_order ASC`;
  - `id ASC`.
- Атрибуты возвращаются только если:
  - `ad.is_active = 1`;
  - `pa.value IS NOT NULL`;
  - `pa.value != ''`.
- Атрибуты сортируются по:
  - `ad.sort_order ASC`;
  - `ad.id ASC`.

## PHP-код

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

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Документ структурирован из `php-after-changes/api-places-updated.md`. |