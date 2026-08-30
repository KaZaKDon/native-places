# api/my-places/index.php

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

Endpoint возвращает список объектов/объявлений текущего авторизованного пользователя.

Используется в личном кабинете для раздела «Мои места» / «Мои объявления».

В ответе возвращаются основные поля объявления, данные категории, типа, населённого пункта и количество изображений.

## Метод и URL

```http
GET /api/my-places/index.php
```

## Авторизация

Требуется user session.

Endpoint вызывает:

```php
$userId = requireAuth();
```

Если пользователь не авторизован, backend должен вернуть `401`.

## Request

Тело запроса не требуется.

Query-параметры не используются.

## Success response

HTTP `200`

```json
{
  "success": true,
  "data": {
    "places": [
      {
        "id": 1,
        "user_id": 10,
        "category_id": 2,
        "place_type_id": 3,
        "locality_id": 4,
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
        "type_title": "Место",
        "images_count": 3
      }
    ]
  }
}
```

## Response fields

### Основные поля объявления

| Поле | Тип | Описание |
|---|---|---|
| `id` | number | ID объекта. |
| `user_id` | number | ID владельца. |
| `category_id` | number | ID категории. |
| `place_type_id` | number | ID типа места. |
| `locality_id` | number/null | ID населённого пункта. |
| `title` | string | Название объекта. |
| `slug` | string | Slug объекта. |
| `short_description` | string/null | Краткое описание. |
| `full_description` | string/null | Полное описание. |
| `cover_image` | string/null | Обложка. |
| `address` | string/null | Адрес. |
| `latitude` | string/null | Широта. |
| `longitude` | string/null | Долгота. |

### Контакты и бронирование

| Поле | Тип | Описание |
|---|---|---|
| `contact_name` | string/null | Контактное имя. |
| `phone` | string/null | Телефон. |
| `telegram` | string/null | Telegram. |
| `email` | string/null | Email. |
| `website` | string/null | Сайт. |
| `booking_type` | string/null | Тип бронирования. |
| `booking_url` | string/null | Ссылка бронирования. |

### Публикация и оплата

| Поле | Тип | Описание |
|---|---|---|
| `publication_type` | string/null | Тип публикации. |
| `payment_status` | string/null | Статус оплаты. |
| `is_commercial` | number | Коммерческий объект или нет. |
| `status` | string | Статус объекта. |
| `moderated_at` | string/null | Дата модерации. |
| `published_at` | string/null | Дата публикации. |
| `expires_at` | string/null | Дата окончания публикации. |

### Связанные данные

| Поле | Тип | Описание |
|---|---|---|
| `locality_title` | string/null | Название населённого пункта. |
| `locality_slug` | string/null | Slug населённого пункта. |
| `locality_region` | string/null | Регион. |
| `locality_district` | string/null | Район. |
| `category_code` | string | Код категории. |
| `category_title` | string | Название категории. |
| `type_code` | string | Код типа. |
| `type_title` | string | Название типа. |
| `images_count` | number | Количество изображений объекта. |

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `500` | `Не удалось получить список объектов пользователя` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint используется для списка объявлений в личном кабинете.
- Можно группировать/фильтровать карточки по `status`.
- Backend уже сортирует объекты по статусу и дате обновления.
- Порядок статусов в сортировке:
  1. `pending`;
  2. `published`;
  3. `rejected`;
  4. `expired`;
  5. остальные.
- Для UI статуса оплаты использовать `payment_status`.
- Для бейджа изображений использовать `images_count`.
- Для карточки объекта можно использовать:
  - `title`;
  - `cover_image`;
  - `status`;
  - `payment_status`;
  - `category_title`;
  - `type_title`;
  - `locality_title`;
  - `updated_at`.
- Если `places` пустой, показать empty state с предложением создать объект.
- При `401` отправить пользователя на login.

## Backend notes

- Используются таблицы:
  - `places`;
  - `categories`;
  - `place_types`;
  - `localities`;
  - `regions`;
  - `districts`;
  - `place_images`.
- Endpoint возвращает только объекты текущего пользователя:
  - `p.user_id = :user_id`.
- Количество изображений считается подзапросом по `place_images`.
- Регион и район берутся через `regions`/`districts`, а при отсутствии — fallback на поля `localities.region` и `localities.district`.

## PHP-код

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
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
            pt.title AS type_title,

            (
                SELECT COUNT(*)
                FROM place_images pi
                WHERE pi.place_id = p.id
            ) AS images_count

        FROM places p
        LEFT JOIN place_private_data ppd ON ppd.place_id = p.id
        LEFT JOIN place_publication_settings pps ON pps.place_id = p.id
        INNER JOIN categories c ON c.id = p.category_id
        INNER JOIN place_types pt ON pt.id = p.place_type_id
        LEFT JOIN localities l ON l.id = p.locality_id
        LEFT JOIN regions r ON r.id = l.region_id
        LEFT JOIN districts d ON d.id = l.district_id
        WHERE p.user_id = :user_id
        ORDER BY
            CASE p.status
                WHEN 'pending' THEN 1
                WHEN 'published' THEN 2
                WHEN 'rejected' THEN 3
                WHEN 'expired' THEN 4
                ELSE 5
            END ASC,
            p.updated_at DESC,
            p.id DESC
    ");

    $stmt->execute([
        'user_id' => $userId,
    ]);

    successResponse([
        'places' => $stmt->fetchAll(),
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить список объектов пользователя', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Документ структурирован из `php-after-changes/api-my-places-updated.md`. |