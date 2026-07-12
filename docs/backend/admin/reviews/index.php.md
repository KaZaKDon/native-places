# api/admin/reviews/index.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Reviews |
| Тип | PHP endpoint |
| Авторизация | Требуется admin/moderator session |
| Middleware | `requireAdminOrModerator()` |
| Источник | Код с хоста `api/admin/reviews/index.php` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Возвращает список отзывов для административной панели.

Endpoint поддерживает фильтры:

- по статусу;
- по поисковому запросу.

В ответе возвращает массив отзывов и применённые фильтры.

## Метод и URL

```http
GET /api/admin/reviews/index.php
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
| `status` | string | нет | Фильтр по статусу отзыва |
| `q` | string | нет | Поисковый запрос |

## Allowed statuses

```php
$allowedStatuses = [
    '',
    'pending',
    'published',
    'rejected',
];
```

| Статус | Описание |
|---|---|
| пустая строка | Без фильтра по статусу |
| `pending` | На модерации |
| `published` | Опубликован |
| `rejected` | Отклонён |

## Валидация

### `status`

Если статус не входит в список разрешённых:

```json
{
  "success": false,
  "message": "Некорректный статус отзыва"
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
  "reviews": [
    {
      "id": 10,
      "place_id": 123,
      "user_id": 15,
      "review_text": "Хорошее место",
      "status": "pending",
      "created_at": "2026-06-01 12:00:00",
      "updated_at": "2026-06-01 12:00:00",
      "moderated_at": null,
      "place_title": "Название места",
      "place_slug": "place-slug",
      "place_status": "published",
      "cover_image": "/uploads/places/image.webp",
      "user_email": "user@example.com",
      "user_first_name": "Иван",
      "user_last_name": "Иванов",
      "user_avatar": "/uploads/avatars/user.webp"
    }
  ],
  "filters": {
    "status": "pending",
    "q": "поиск"
  }
}
```

## Структура `reviews[]`

| Поле | Тип | Описание |
|---|---:|---|
| `id` | number | ID отзыва |
| `place_id` | number | ID объявления |
| `user_id` | number | ID автора отзыва |
| `review_text` | string | Текст отзыва |
| `status` | string | Статус отзыва |
| `created_at` | string | Дата создания |
| `updated_at` | string/null | Дата обновления |
| `moderated_at` | string/null | Дата модерации |
| `place_title` | string | Название объявления |
| `place_slug` | string | Slug объявления |
| `place_status` | string | Статус объявления |
| `cover_image` | string/null | Обложка объявления |
| `user_email` | string | Email автора |
| `user_first_name` | string/null | Имя автора |
| `user_last_name` | string/null | Фамилия автора |
| `user_avatar` | string/null | Аватар автора |

## Поиск

Если передан `q`, поиск идёт по:

- `r.review_text`;
- `p.title`;
- `u.email`;
- `u.first_name`;
- `u.last_name`.

Поиск выполняется через `LIKE`.

## Error responses

### 422 — некорректный статус

```json
{
  "success": false,
  "message": "Некорректный статус отзыва"
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
  "message": "Не удалось получить отзывы",
  "error": "..."
}
```

## Frontend notes

- Используется для таблицы отзывов в админке.
- Можно фильтровать по статусу и строке поиска.
- Endpoint возвращает применённые фильтры в `filters`.
- Список уже отсортирован backend-ом:
  - `r.created_at DESC`;
  - `r.id DESC`.
- В текущей версии пагинации нет.
- Для подробной карточки отзыва использовать `show.php`.
- Для действий модерации использовать:
  - `publish.php`;
  - `reject.php`.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdminOrModerator()`.
- Подключение к базе фактически приходит через `require-admin.php`.
- Использует динамическую сборку SQL с подготовленными параметрами.
- Данные объявления подтягиваются из `places`.
- Автор отзыва подтягивается из `users`.
- Endpoint не использует пагинацию.

## PHP-код

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdminOrModerator();

$status = trim((string) ($_GET['status'] ?? ''));
$query = trim((string) ($_GET['q'] ?? ''));

$allowedStatuses = [
    '',
    'pending',
    'published',
    'rejected',
];

if (!in_array($status, $allowedStatuses, true)) {
    errorResponse('Некорректный статус отзыва', 422);
}

if (mb_strlen($query, 'UTF-8') > 100) {
    errorResponse('Поисковый запрос слишком длинный', 422);
}

try {
    $pdo = getDatabaseConnection();

    $sql = "
        SELECT
            r.id,
            r.place_id,
            r.user_id,
            r.review_text,
            r.status,
            r.created_at,
            r.updated_at,
            r.moderated_at,

            p.title AS place_title,
            p.slug AS place_slug,
            p.status AS place_status,
            p.cover_image,

            u.email AS user_email,
            u.first_name AS user_first_name,
            u.last_name AS user_last_name,
            u.avatar AS user_avatar
        FROM reviews r
        INNER JOIN places p
            ON p.id = r.place_id
        INNER JOIN users u
            ON u.id = r.user_id
        WHERE 1 = 1
    ";

    $params = [];

    if ($status !== '') {
        $sql .= " AND r.status = :status";
        $params['status'] = $status;
    }

    if ($query !== '') {
        $sql .= "
            AND (
                r.review_text LIKE :query_review_text
                OR p.title LIKE :query_place_title
                OR u.email LIKE :query_user_email
                OR u.first_name LIKE :query_user_first_name
                OR u.last_name LIKE :query_user_last_name
            )
        ";

        $searchValue = '%' . $query . '%';

        $params['query_review_text'] = $searchValue;
        $params['query_place_title'] = $searchValue;
        $params['query_user_email'] = $searchValue;
        $params['query_user_first_name'] = $searchValue;
        $params['query_user_last_name'] = $searchValue;
    }

    $sql .= "
        ORDER BY r.created_at DESC, r.id DESC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    successResponse([
        'reviews' => $stmt->fetchAll(),
        'filters' => [
            'status' => $status,
            'q' => $query,
        ],
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить отзывы', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-05 | Файл оформлен по коду с хоста и перенесён в структуру `docs/backend/admin/reviews`. |