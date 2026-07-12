# api/admin/places/show.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Places |
| Тип | PHP endpoint |
| Авторизация | Требуется admin/moderator session |
| Middleware | `requireAdminOrModerator()` |
| Источник | Код с хоста `api/admin/places/show.php` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Возвращает подробную карточку объявления для административной панели.

Endpoint отдаёт:

- основные данные объявления;
- данные владельца;
- категорию;
- тип места;
- изображения;
- атрибуты объявления.

## Метод и URL

```http
GET /api/admin/places/show.php?id=123
```

## Авторизация

Требуется административная или модераторская сессия.

Проверка выполняется через:

```php
requireAdminOrModerator();
```

Endpoint доступен администратору и модератору.

## Query params

| Параметр | Тип | Обязательный | Описание |
|---|---:|---:|---|
| `id` | number | да | ID объявления |

## Success response

```json
{
  "success": true,
  "place": {
    "id": 123,
    "user_id": 15,
    "category_id": 1,
    "place_type_id": 2,
    "locality_id": null,
    "title": "Название места",
    "slug": "place-slug",
    "short_description": "Краткое описание",
    "full_description": "Полное описание",
    "cover_image": "/uploads/places/image.webp",
    "address": "Адрес",
    "latitude": "55.7558",
    "longitude": "37.6173",
    "contact_name": "Иван",
    "phone": "+79990000000",
    "telegram": "@user",
    "email": "place@example.com",
    "website": "https://example.com",
    "status": "pending",
    "publication_type": "free",
    "payment_status": "paid",
    "is_commercial": 0,
    "published_at": null,
    "expires_at": null,
    "closed_at": null,
    "moderated_at": null,
    "booking_type": null,
    "booking_url": null,
    "created_at": "2026-06-01 12:00:00",
    "updated_at": "2026-06-02 12:00:00",
    "owner_email": "user@example.com",
    "owner_first_name": "Иван",
    "owner_last_name": "Иванов",
    "owner_phone": "+79990000000",
    "owner_telegram": "@user",
    "category_code": "food",
    "category_title": "Еда",
    "type_code": "restaurant",
    "type_title": "Ресторан"
  },
  "images": [
    {
      "id": 1,
      "image_path": "/uploads/places/1.webp",
      "sort_order": 1,
      "is_cover": 1,
      "created_at": "2026-06-01 12:00:00"
    }
  ],
  "attributes": [
    {
      "id": 1,
      "place_id": 123,
      "attribute_definition_id": 5,
      "value": "true",
      "code": "wifi",
      "title": "Wi-Fi",
      "field_type": "boolean",
      "sort_order": 10
    }
  ]
}
```

## Структура ответа

### `place`

Основная карточка объявления.

Содержит:

- поля из таблицы `places`;
- данные владельца из `users`;
- данные категории из `categories`;
- данные типа места из `place_types`.

### `images[]`

Изображения объявления из таблицы `place_images`.

Сортировка:

```sql
ORDER BY sort_order ASC, id ASC
```

### `attributes[]`

Атрибуты объявления из таблицы `place_attributes` с описанием из `attribute_definitions`.

Сортировка:

```sql
ORDER BY ad.sort_order ASC, ad.id ASC
```

## Error responses

### 422 — не передан ID объявления

```json
{
  "success": false,
  "message": "Не передан ID объявления"
}
```

### 404 — объявление не найдено

```json
{
  "success": false,
  "message": "Объявление не найдено"
}
```

### 401 / 403 — нет доступа

Формируется в `requireAdminOrModerator()`.

Точный формат зависит от реализации `api/admin/shared/require-admin.php`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось получить объявление",
  "error": "..."
}
```

## Frontend notes

- Используется для карточки объявления в админке.
- Подходит для экрана модерации.
- Для действий использовать:
  - `publish.php`;
  - `reject.php`;
  - `archive.php`.
- `images` можно показывать как галерею.
- `attributes` можно показывать отдельным блоком характеристик.
- Контакты владельца и контакты объявления приходят отдельно:
  - `owner_*` — владелец аккаунта;
  - `contact_name`, `phone`, `telegram`, `email`, `website` — контактные поля объявления.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdminOrModerator()`.
- Подключение к базе фактически приходит через `require-admin.php`.
- Endpoint делает три запроса:
  - карточка объявления;
  - изображения;
  - атрибуты.
- В карточку попадают все основные поля объявления, включая координаты, бронь и статусы оплаты/публикации.
- Endpoint не пишет moderator-log, потому что только читает данные.

## PHP-код

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdminOrModerator();

$placeId = (int) ($_GET['id'] ?? 0);

if ($placeId <= 0) {
    errorResponse('Не передан ID объявления', 422);
}

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
            p.published_at,
            p.expires_at,
            p.closed_at,
            p.moderated_at,
            p.booking_type,
            p.booking_url,
            p.created_at,
            p.updated_at,

            u.email AS owner_email,
            u.first_name AS owner_first_name,
            u.last_name AS owner_last_name,
            u.phone AS owner_phone,
            u.telegram AS owner_telegram,

            c.code AS category_code,
            c.title AS category_title,

            pt.code AS type_code,
            pt.title AS type_title
        FROM places p
        INNER JOIN users u
            ON u.id = p.user_id
        INNER JOIN categories c
            ON c.id = p.category_id
        INNER JOIN place_types pt
            ON pt.id = p.place_type_id
        WHERE p.id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $placeId,
    ]);

    $place = $stmt->fetch();

    if (!$place) {
        errorResponse('Объявление не найдено', 404);
    }

    $imagesStmt = $pdo->prepare("
        SELECT
            id,
            image_path,
            sort_order,
            is_cover,
            created_at
        FROM place_images
        WHERE place_id = :place_id
        ORDER BY sort_order ASC, id ASC
    ");

    $imagesStmt->execute([
        'place_id' => $placeId,
    ]);

    $attributesStmt = $pdo->prepare("
        SELECT
            pa.id,
            pa.place_id,
            pa.attribute_definition_id,
            pa.value,
            ad.code,
            ad.title,
            ad.field_type,
            ad.sort_order
        FROM place_attributes pa
        INNER JOIN attribute_definitions ad
            ON ad.id = pa.attribute_definition_id
        WHERE pa.place_id = :place_id
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
    errorResponse('Не удалось получить объявление', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Файл оформлен по коду с хоста и перенесён в структуру `docs/backend/admin/places`. |