# api/places/featured.php

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

Endpoint возвращает список рекомендуемых/последних опубликованных объектов.

Используется для блоков на главной странице, витрины или короткого списка объектов.

В выборку попадают только объекты, которые:

- опубликованы;
- не просрочены;
- не требуют неоплаченной оплаты;
- относятся к активной категории;
- относятся к активному типу.

## Метод и URL

```http
GET /api/places/featured.php
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
    "places": [
      {
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
      }
    ]
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `500` | `Не удалось получить рекомендуемые объекты` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint подходит для главной страницы.
- Возвращает максимум 6 объектов.
- Объекты уже отсортированы от более новых к более старым.
- Для карточки использовать:
  - `title`;
  - `slug`;
  - `short_description`;
  - `cover_image`;
  - `address`;
  - `locality_title`;
  - `category_title`;
  - `type_title`.
- Для перехода на страницу объекта использовать `slug`.
- Если `places` пустой, скрыть блок или показать пустое состояние.
- Для карты можно использовать `latitude` и `longitude`.

## Backend notes

- Используются таблицы:
  - `places`;
  - `categories`;
  - `place_types`;
  - `localities`.
- В выборку попадают только:
  - `p.status = 'published'`;
  - `p.expires_at IS NULL OR p.expires_at >= NOW()`;
  - `p.payment_status IS NULL OR p.payment_status IN ('not_required', 'paid')`;
  - `c.is_active = 1`;
  - `pt.is_active = 1`.
- Сортировка:
  - `p.published_at DESC`;
  - `p.created_at DESC`;
  - `p.id DESC`.
- Лимит:
  - `6`.

## PHP-код

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

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Документ структурирован из `php-after-changes/api-places-updated.md`. |