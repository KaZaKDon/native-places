# api/admin/places/index.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Places |
| Тип | PHP endpoint |
| Авторизация | Требуется admin/moderator session |
| Middleware | `requireAdminOrModerator()` |
| Источник | Код с хоста `api/admin/places/index.php` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Возвращает список объявлений для административной панели.

Endpoint поддерживает фильтры:

- по статусу;
- по категории;
- по поисковому запросу.

В ответе возвращает массив объявлений и применённые фильтры.

## Метод и URL

```http
GET /api/admin/places/index.php
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
| `status` | string | нет | Фильтр по статусу объявления |
| `category` | string | нет | Код категории |
| `q` | string | нет | Поисковый запрос |

## Allowed statuses

```php
$allowedStatuses = [
    '',
    'pending',
    'published',
    'rejected',
    'expired',
];
```

| Статус | Описание |
|---|---|
| пустая строка | Без фильтра по статусу |
| `pending` | На модерации |
| `published` | Опубликовано |
| `rejected` | Отклонено |
| `expired` | В архиве / истекло |

## Валидация

### `status`

Если статус не входит в список разрешённых:

```json
{
  "success": false,
  "message": "Некорректный статус объявления"
}
```

### `category`

Категория должна соответствовать формату:

```regex
^[a-z0-9_-]+$
```

Иначе:

```json
{
  "success": false,
  "message": "Некорректная категория"
}
```

### `q`

Поисковый запрос не должен быть длиннее 100 символов.

Иначе:

```json
{
  "success": false,
  "message": "Поисковый запрос слишком длинный"
}
```

## Success response

```json
{
  "success": true,
  "places": [
    {
      "id": 123,
      "user_id": 15,
      "category_id": 1,
      "place_type_id": 2,
      "title": "Название места",
      "slug": "place-slug",
      "short_description": "Краткое описание",
      "cover_image": "/uploads/places/image.webp",
      "address": "Адрес",
      "status": "pending",
      "publication_type": "free",
      "payment_status": "paid",
      "created_at": "2026-06-01 12:00:00",
      "updated_at": "2026-06-02 12:00:00",
      "owner_email": "user@example.com",
      "owner_first_name": "Иван",
      "owner_last_name": "Иванов",
      "category_code": "food",
      "category_title": "Еда",
      "type_code": "restaurant",
      "type_title": "Ресторан"
    }
  ],
  "filters": {
    "status": "pending",
    "category": "food",
    "q": "поиск"
  }
}
```

## Структура `places[]`

| Поле | Тип | Описание |
|---|---:|---|
| `id` | number | ID объявления |
| `user_id` | number | ID владельца |
| `category_id` | number | ID категории |
| `place_type_id` | number | ID типа места |
| `title` | string | Название |
| `slug` | string | Slug |
| `short_description` | string/null | Краткое описание |
| `cover_image` | string/null | Обложка |
| `address` | string/null | Адрес |
| `status` | string | Статус объявления |
| `publication_type` | string/null | Тип публикации |
| `payment_status` | string/null | Статус оплаты |
| `created_at` | string | Дата создания |
| `updated_at` | string/null | Дата обновления |
| `owner_email` | string | Email владельца |
| `owner_first_name` | string/null | Имя владельца |
| `owner_last_name` | string/null | Фамилия владельца |
| `category_code` | string | Код категории |
| `category_title` | string | Название категории |
| `type_code` | string | Код типа |
| `type_title` | string | Название типа |

## Поиск

Если передан `q`, поиск идёт по:

- `p.title`;
- `p.short_description`;
- `p.address`;
- `u.email`;
- `u.first_name`;
- `u.last_name`.

Поиск выполняется через `LIKE`.

## Error responses

### 422 — некорректный статус

```json
{
  "success": false,
  "message": "Некорректный статус объявления"
}
```

### 422 — некорректная категория

```json
{
  "success": false,
  "message": "Некорректная категория"
}
```

### 422 — слишком длинный поиск

```json
{
  "success": false,
  "message": "Поисковый запрос слишком длинный"
}
```

### 401 / 403 — нет доступа

Формируется в `requireAdminOrModerator()`.

Точный формат зависит от реализации `api/admin/shared/require-admin.php`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось получить объявления",
  "error": "..."
}
```

## Frontend notes

- Используется для таблицы объявлений в админке.
- Можно строить фильтры по:
  - статусу;
  - категории;
  - строке поиска.
- Endpoint возвращает применённые фильтры в `filters`.
- Список уже отсортирован backend-ом:
  - `p.created_at DESC`;
  - `p.id DESC`.
- В текущей версии пагинации нет.
- Для подробной карточки объявления использовать `show.php`.
- Для действий модерации использовать:
  - `publish.php`;
  - `reject.php`;
  - `archive.php`.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdminOrModerator()`.
- Подключение к базе фактически приходит через `require-admin.php`.
- Использует динамическую сборку SQL с подготовленными параметрами.
- Категория фильтруется по `categories.code`.
- Тип места подтягивается из `place_types`.
- Владелец подтягивается из `users`.
- Endpoint не использует пагинацию.

## PHP-код

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdminOrModerator();

$status = trim((string) ($_GET['status'] ?? ''));
$category = trim((string) ($_GET['category'] ?? ''));
$query = trim((string) ($_GET['q'] ?? ''));

$allowedStatuses = [
    '',
    'pending',
    'published',
    'rejected',
    'expired',
];

if (!in_array($status, $allowedStatuses, true)) {
    errorResponse('Некорректный статус объявления', 422);
}

if ($category !== '' && !preg_match('/^[a-z0-9_-]+$/', $category)) {
    errorResponse('Некорректная категория', 422);
}

if (mb_strlen($query, 'UTF-8') > 100) {
    errorResponse('Поисковый запрос слишком длинный', 422);
}

try {
    $pdo = getDatabaseConnection();

    $sql = "
        SELECT
            p.id,
            p.user_id,
            p.category_id,
            p.place_type_id,
            p.title,
            p.slug,
            p.short_description,
            p.cover_image,
            p.address,
            p.status,
            p.publication_type,
            p.payment_status,
            p.created_at,
            p.updated_at,

            u.email AS owner_email,
            u.first_name AS owner_first_name,
            u.last_name AS owner_last_name,

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
        WHERE 1 = 1
    ";

    $params = [];

    if ($status !== '') {
        $sql .= " AND p.status = :status";
        $params['status'] = $status;
    }

    if ($category !== '') {
        $sql .= " AND c.code = :category";
        $params['category'] = $category;
    }

    if ($query !== '') {
        $sql .= "
            AND (
                p.title LIKE :query_title
                OR p.short_description LIKE :query_short_description
                OR p.address LIKE :query_address
                OR u.email LIKE :query_owner_email
                OR u.first_name LIKE :query_owner_first_name
                OR u.last_name LIKE :query_owner_last_name
            )
        ";

        $searchValue = '%' . $query . '%';

        $params['query_title'] = $searchValue;
        $params['query_short_description'] = $searchValue;
        $params['query_address'] = $searchValue;
        $params['query_owner_email'] = $searchValue;
        $params['query_owner_first_name'] = $searchValue;
        $params['query_owner_last_name'] = $searchValue;
    }

    $sql .= "
        ORDER BY p.created_at DESC, p.id DESC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    successResponse([
        'places' => $stmt->fetchAll(),
        'filters' => [
            'status' => $status,
            'category' => $category,
            'q' => $query,
        ],
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить объявления', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Файл оформлен по коду с хоста и перенесён в структуру `docs/backend/admin/places`. |