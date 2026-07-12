# api/admin/reports/index.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Reports |
| Тип | PHP endpoint |
| Авторизация | Требуется admin/moderator session |
| Middleware | `requireAdminOrModerator()` |
| Источник | Код с хоста `api/admin/reports/index.php` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Возвращает список жалоб для административной панели.

Endpoint поддерживает фильтры:

- по статусу;
- по поисковому запросу.

В ответе возвращает массив жалоб и применённые фильтры.

## Метод и URL

```http
GET /api/admin/reports/index.php
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
| `status` | string | нет | Фильтр по статусу жалобы |
| `q` | string | нет | Поисковый запрос |

## Allowed statuses

```php
$allowedStatuses = [
    '',
    'new',
    'in_progress',
    'resolved',
    'rejected',
];
```

| Статус | Описание |
|---|---|
| пустая строка | Без фильтра по статусу |
| `new` | Новая жалоба |
| `in_progress` | В работе |
| `resolved` | Решена |
| `rejected` | Отклонена |

## Валидация

### `status`

Если статус не входит в список разрешённых:

```json
{
  "success": false,
  "message": "Некорректный статус жалобы"
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
  "reports": [
    {
      "id": 12,
      "place_id": 123,
      "user_id": 15,
      "report_type": "spam",
      "message": "Жалоба пользователя",
      "status": "new",
      "created_at": "2026-06-01 12:00:00",
      "updated_at": "2026-06-01 12:00:00",
      "resolved_at": null,
      "place_title": "Название места",
      "place_slug": "place-slug",
      "place_status": "published",
      "cover_image": "/uploads/places/image.webp",
      "user_email": "user@example.com",
      "user_first_name": "Иван",
      "user_last_name": "Иванов"
    }
  ],
  "filters": {
    "status": "new",
    "q": "поиск"
  }
}
```

## Структура `reports[]`

| Поле | Тип | Описание |
|---|---:|---|
| `id` | number | ID жалобы |
| `place_id` | number | ID объявления |
| `user_id` | number | ID автора жалобы |
| `report_type` | string | Тип жалобы |
| `message` | string/null | Текст жалобы |
| `status` | string | Статус жалобы |
| `created_at` | string | Дата создания |
| `updated_at` | string/null | Дата обновления |
| `resolved_at` | string/null | Дата решения |
| `place_title` | string | Название объявления |
| `place_slug` | string | Slug объявления |
| `place_status` | string | Статус объявления |
| `cover_image` | string/null | Обложка объявления |
| `user_email` | string | Email автора жалобы |
| `user_first_name` | string/null | Имя автора |
| `user_last_name` | string/null | Фамилия автора |

## Поиск

Если передан `q`, поиск идёт по:

- `r.message`;
- `r.report_type`;
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
  "message": "Некорректный статус жалобы"
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
  "message": "Не удалось получить жалобы",
  "error": "..."
}
```

## Frontend notes

- Используется для таблицы жалоб в админке.
- Можно фильтровать по статусу и строке поиска.
- Endpoint возвращает применённые фильтры в `filters`.
- Список уже отсортирован backend-ом:
  - `r.created_at DESC`;
  - `r.id DESC`.
- В текущей версии пагинации нет.
- Для подробной карточки жалобы использовать `show.php`.
- Для закрытия жалобы использовать `close.php`.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdminOrModerator()`.
- Подключение к базе фактически приходит через `require-admin.php`.
- Использует динамическую сборку SQL с подготовленными параметрами.
- Данные объявления подтягиваются из `places`.
- Автор жалобы подтягивается из `users`.
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
    'new',
    'in_progress',
    'resolved',
    'rejected',
];

if (!in_array($status, $allowedStatuses, true)) {
    errorResponse('Некорректный статус жалобы', 422);
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
            r.report_type,
            r.message,
            r.status,
            r.created_at,
            r.updated_at,
            r.resolved_at,

            p.title AS place_title,
            p.slug AS place_slug,
            p.status AS place_status,
            p.cover_image,

            u.email AS user_email,
            u.first_name AS user_first_name,
            u.last_name AS user_last_name
        FROM reports r
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
                r.message LIKE :query_message
                OR r.report_type LIKE :query_report_type
                OR p.title LIKE :query_place_title
                OR u.email LIKE :query_user_email
                OR u.first_name LIKE :query_user_first_name
                OR u.last_name LIKE :query_user_last_name
            )
        ";

        $searchValue = '%' . $query . '%';

        $params['query_message'] = $searchValue;
        $params['query_report_type'] = $searchValue;
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
        'reports' => $stmt->fetchAll(),
        'filters' => [
            'status' => $status,
            'q' => $query,
        ],
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить жалобы', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Файл оформлен по коду с хоста и перенесён в структуру `docs/backend/admin/reports`. |