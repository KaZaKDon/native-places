# api/my-places/show.php

## Статус

| Поле | Значение |
|---|---|
| Backend на хосте | да |
| Код сверено с хостом | да |
| Источник | `php-after-changes/api-my-places-updated.md` |
| Подключено на фронте | уточнить |
| Нужны правки backend | нет |
| Нужны правки frontend | уточнить |

## Назначение

Endpoint возвращает один объект/объявление текущего авторизованного пользователя.

Используется для:

- страницы просмотра объекта в личном кабинете;
- формы редактирования объекта;
- восстановления данных перед изменением объявления.

В ответе возвращаются:

- основные данные объекта;
- изображения;
- дополнительные атрибуты.

## Метод и URL

```http
GET /api/my-places/show.php?place_id={id}
```

## Авторизация

Требуется user session.

Endpoint вызывает:

```php
$userId = requireAuth();
```

Пользователь может получить только свой объект.

## Query params

| Параметр | Тип | Обязательный | Описание |
|---|---|---:|---|
| `place_id` | number | да | ID объекта текущего пользователя. |

## Success response

HTTP `200`

```json
{
  "success": true,
  "data": {
    "place": {
      "id": 1,
      "user_id": 10,
      "category_id": 2,
      "place_type_id": 3,
      "locality_id": 4,
      "title": "Название объекта",
      "slug": "place-slug",
      "short_description": "Краткое описание",
      "full_description": "Полное описание",
      "cover_image": "/path/to/cover.jpg",
      "address": "Адрес",
      "latitude": "47.222",
      "longitude": "39.718",
      "contact_name": "Имя",
      "phone": "+79990000000",
      "telegram": "@username",
      "email": "user@example.com",
      "website": "https://example.com",
      "booking_type": "external",
      "booking_url": "https://booking.example.com",
      "publication_type": "free",
      "payment_status": "not_required",
      "is_commercial": 0,
      "status": "published",
      "moderated_at": "2026-07-04 10:00:00",
      "published_at": "2026-07-04 10:00:00",
      "expires_at": null,
      "created_at": "2026-07-04 09:00:00",
      "updated_at": "2026-07-04 10:00:00",
      "locality_title": "Ростов-на-Дону",
      "locality_slug": "rostov-na-donu",
      "locality_region": "Ростовская область",
      "locality_district": null,
      "category_code": "museum",
      "category_title": "Музеи",
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
        "value": "Значение",
        "code": "attribute_code",
        "title": "Название атрибута",
        "field_type": "text",
        "sort_order": 1
      }
    ]
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `400` | `Не передан ID объекта` | `place_id` отсутствует или меньше/равен нулю. |
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `404` | `Объект не найден или нет доступа` | Объект не найден или не принадлежит текущему пользователю. |
| `500` | `Не удалось получить объект` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint удобно использовать для заполнения формы редактирования.
- `place` содержит основные поля объекта.
- `images` использовать для галереи и выбора обложки.
- `attributes` использовать для восстановления дополнительных полей формы.
- Если объект имеет статус `expired`, форму редактирования можно заблокировать или ограничить.
- При `404` показать сообщение, что объект не найден или нет доступа.
- При `401` отправить пользователя на login.

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
- Объект выбирается только по:
  - `p.id = :id`;
  - `p.user_id = :user_id`.
- Изображения сортируются по:
  - `sort_order ASC`;
  - `id ASC`.
- Атрибуты возвращаются только для активных определений:
  - `ad.is_active = 1`.
- Атрибуты сортируются по:
  - `ad.sort_order ASC`;
  - `ad.id ASC`.

## PHP-код

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$placeId = (int) ($_GET['place_id'] ?? 0);

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

try {
    $pdo = getDatabaseConnection();

    $placeStmt = $pdo->prepare("
        SELECT
            p.id,
            p.user_id,
            p.category_id,
            p.place_type_id,
            p.locality_id,
            p.title,
            p.slug,
            p.short_description,
            p.full_description,
            p.cover_image,
            COALESCE(ppd.address, p.address) AS address,
            COALESCE(ppd.latitude, p.latitude) AS latitude,
            COALESCE(ppd.longitude, p.longitude) AS longitude,
            COALESCE(ppd.contact_name, p.contact_name) AS contact_name,
            COALESCE(ppd.phone, p.phone) AS phone,
            COALESCE(ppd.telegram, p.telegram) AS telegram,
            COALESCE(ppd.email, p.email) AS email,
            p.website,
            p.booking_type,
            p.booking_url,
            p.publication_type,
            p.payment_status,
            p.is_commercial,
            p.status,
            p.moderated_at,
            p.published_at,
            p.expires_at,
            p.created_at,
            p.updated_at,

            COALESCE(pps.show_contact_name, 0) AS show_contact_name,
            COALESCE(pps.show_phone, 0) AS show_phone,
            COALESCE(pps.show_email, 0) AS show_email,
            COALESCE(pps.show_telegram, 0) AS show_telegram,
            COALESCE(pps.show_address, 0) AS show_address,
            COALESCE(pps.show_coordinates, 1) AS show_coordinates,

            l.title AS locality_title,
            l.slug AS locality_slug,
            COALESCE(r.title, l.region) AS locality_region,
            COALESCE(d.title, l.district) AS locality_district,

            c.code AS category_code,
            c.title AS category_title,

            pt.code AS type_code,
            pt.title AS type_title

        FROM places p
        LEFT JOIN place_private_data ppd ON ppd.place_id = p.id
        LEFT JOIN place_publication_settings pps ON pps.place_id = p.id
        INNER JOIN categories c ON c.id = p.category_id
        INNER JOIN place_types pt ON pt.id = p.place_type_id
        LEFT JOIN localities l ON l.id = p.locality_id
        LEFT JOIN regions r ON r.id = l.region_id
        LEFT JOIN districts d ON d.id = l.district_id
        WHERE p.id = :id
        AND p.user_id = :user_id
        LIMIT 1
    ");

    $placeStmt->execute([
        'id' => $placeId,
        'user_id' => $userId,
    ]);

    $place = $placeStmt->fetch();

    if (!$place) {
        errorResponse('Объект не найден или нет доступа', 404);
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
        'place_id' => $placeId,
    ]);

    $attributesStmt = $pdo->prepare("
        SELECT
            pa.attribute_definition_id,
            pa.value,
            ad.code,
            ad.title,
            ad.field_type,
            ad.sort_order
        FROM place_attributes pa
        INNER JOIN attribute_definitions ad ON ad.id = pa.attribute_definition_id
        WHERE pa.place_id = :place_id
        AND ad.is_active = 1
        ORDER BY ad.sort_order ASC, ad.id ASC
    ");

    $attributesStmt->execute([
        'place_id' => $placeId,
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
| 2026-07-04 | Документ структурирован из `php-after-changes/api-my-places-updated.md`. |