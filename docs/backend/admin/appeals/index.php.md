# api/admin/appeals/index.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Appeals |
| Тип | PHP endpoint |
| Авторизация | Требуется admin/moderator session |
| Middleware | `requireAdminOrModerator()` |
| Источник | Код с хоста `api/admin/appeals/index.php` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Возвращает список обращений пользователей для административной панели.

Endpoint поддерживает фильтры:

- по статусу;
- по поисковому запросу.

В ответе возвращает массив обращений и применённые фильтры.

## Метод и URL

```http
GET /api/admin/appeals/index.php
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
| `status` | string | нет | Фильтр по статусу обращения |
| `q` | string | нет | Поисковый запрос |

## Allowed statuses

```php
$allowedStatuses = [
    '',
    'new',
    'in_work',
    'closed',
];
```

| Статус | Описание |
|---|---|
| пустая строка | Без фильтра по статусу |
| `new` | Новое обращение |
| `in_work` | В работе |
| `closed` | Закрыто |

## Валидация

### `status`

Если статус не входит в список разрешённых:

```json
{
  "success": false,
  "message": "Некорректный статус обращения"
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
  "appeals": [
    {
      "id": 5,
      "user_id": 15,
      "appeal_type": "support",
      "contact": "user@example.com",
      "message": "Текст обращения",
      "admin_response": null,
      "status": "new",
      "created_at": "2026-06-01 12:00:00",
      "updated_at": "2026-06-01 12:00:00",
      "closed_at": null,
      "user_email": "user@example.com",
      "user_first_name": "Иван",
      "user_last_name": "Иванов",
      "user_avatar": "/uploads/avatars/user.webp"
    }
  ],
  "filters": {
    "status": "new",
    "q": "поиск"
  }
}
```

## Структура `appeals[]`

| Поле | Тип | Описание |
|---|---:|---|
| `id` | number | ID обращения |
| `user_id` | number | ID пользователя |
| `appeal_type` | string | Тип обращения |
| `contact` | string/null | Контакт пользователя |
| `message` | string | Текст обращения |
| `admin_response` | string/null | Ответ администрации |
| `status` | string | Статус обращения |
| `created_at` | string | Дата создания |
| `updated_at` | string/null | Дата обновления |
| `closed_at` | string/null | Дата закрытия |
| `user_email` | string | Email пользователя |
| `user_first_name` | string/null | Имя пользователя |
| `user_last_name` | string/null | Фамилия пользователя |
| `user_avatar` | string/null | Аватар пользователя |

## Поиск

Если передан `q`, поиск идёт по:

- `a.message`;
- `a.contact`;
- `a.admin_response`;
- `a.appeal_type`;
- `u.email`;
- `u.first_name`;
- `u.last_name`.

Поиск выполняется через `LIKE`.

## Error responses

### 422 — некорректный статус

```json
{
  "success": false,
  "message": "Некорректный статус обращения"
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
  "message": "Не удалось получить обращения",
  "error": "..."
}
```

## Frontend notes

- Используется для таблицы обращений в админке.
- Можно фильтровать по статусу и строке поиска.
- Endpoint возвращает применённые фильтры в `filters`.
- Список уже отсортирован backend-ом:
  - `a.created_at DESC`;
  - `a.id DESC`.
- В текущей версии пагинации нет.
- Для подробной карточки обращения использовать `show.php`.
- Для изменения статуса и ответа администрации использовать `update.php`.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdminOrModerator()`.
- Подключение к базе фактически приходит через `require-admin.php`.
- Использует динамическую сборку SQL с подготовленными параметрами.
- Пользователь подтягивается из таблицы `users`.
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
    'in_work',
    'closed',
];

if (!in_array($status, $allowedStatuses, true)) {
    errorResponse('Некорректный статус обращения', 422);
}

if (mb_strlen($query, 'UTF-8') > 100) {
    errorResponse('Поисковый запрос слишком длинный', 422);
}

try {
    $pdo = getDatabaseConnection();

    $sql = "
        SELECT
            a.id,
            a.user_id,
            a.appeal_type,
            a.contact,
            a.message,
            a.admin_response,
            a.status,
            a.created_at,
            a.updated_at,
            a.closed_at,

            u.email AS user_email,
            u.first_name AS user_first_name,
            u.last_name AS user_last_name,
            u.avatar AS user_avatar
        FROM appeals a
        INNER JOIN users u
            ON u.id = a.user_id
        WHERE 1 = 1
    ";

    $params = [];

    if ($status !== '') {
        $sql .= " AND a.status = :status";
        $params['status'] = $status;
    }

    if ($query !== '') {
        $sql .= "
            AND (
                a.message LIKE :query_message
                OR a.contact LIKE :query_contact
                OR a.admin_response LIKE :query_admin_response
                OR a.appeal_type LIKE :query_appeal_type
                OR u.email LIKE :query_user_email
                OR u.first_name LIKE :query_user_first_name
                OR u.last_name LIKE :query_user_last_name
            )
        ";

        $searchValue = '%' . $query . '%';

        $params['query_message'] = $searchValue;
        $params['query_contact'] = $searchValue;
        $params['query_admin_response'] = $searchValue;
        $params['query_appeal_type'] = $searchValue;
        $params['query_user_email'] = $searchValue;
        $params['query_user_first_name'] = $searchValue;
        $params['query_user_last_name'] = $searchValue;
    }

    $sql .= "
        ORDER BY a.created_at DESC, a.id DESC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    successResponse([
        'appeals' => $stmt->fetchAll(),
        'filters' => [
            'status' => $status,
            'q' => $query,
        ],
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить обращения', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-05 | Файл оформлен по коду с хоста и перенесён в структуру `docs/backend/admin/appeals`. |