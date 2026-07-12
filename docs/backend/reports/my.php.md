# api/reports/my.php

## Статус

| Поле | Значение |
|---|---|
| Backend на хосте | да |
| Код сверено с хостом | да |
| Источник | `docs/API_FULL_TEXT.md` |
| Подключено на фронте | уточнить |
| Нужны правки backend | нет |
| Нужны правки frontend | уточнить |

## Назначение

Endpoint возвращает жалобы текущего авторизованного пользователя.

Используется в личном кабинете для раздела «Мои жалобы» или истории обращений по объектам.

## Метод и URL

```http
GET /api/reports/my.php
```

## Авторизация

Требуется user session.

Endpoint вызывает:

```php
$userId = requireAuth();
```

## Request

Тело запроса не требуется.

Query-параметры не используются.

## Success response

HTTP `200`

```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "id": 1,
        "place_id": 123,
        "report_type": "incorrect_info",
        "message": "Описание причины жалобы",
        "status": "new",
        "created_at": "2026-07-04 10:00:00",
        "resolved_at": null,
        "place_title": "Название объекта",
        "place_slug": "place-slug",
        "cover_image": "/path/to/image.jpg"
      }
    ]
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `500` | `Не удалось получить жалобы пользователя` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint использовать для истории жалоб пользователя.
- Если `reports` пустой, показать empty state.
- Для перехода к объекту использовать `place_slug`.
- `status` использовать для отображения состояния обработки.
- `resolved_at` показывает дату решения, если жалоба обработана.

## Backend notes

- Используются таблицы:
  - `reports`;
  - `places`.
- Выборка идёт только по текущему пользователю:
  - `reports.user_id = :user_id`.
- Сортировка:
  - `reports.created_at DESC`;
  - `reports.id DESC`.

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
            r.id,
            r.place_id,
            r.report_type,
            r.message,
            r.status,
            r.created_at,
            r.resolved_at,

            p.title AS place_title,
            p.slug AS place_slug,
            p.cover_image

        FROM reports r

        INNER JOIN places p
            ON p.id = r.place_id

        WHERE r.user_id = :user_id

        ORDER BY r.created_at DESC, r.id DESC
    ");

    $stmt->execute([
        'user_id' => $userId,
    ]);

    $reports = $stmt->fetchAll();

    successResponse([
        'reports' => $reports,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось получить жалобы пользователя',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Документ структурирован из `docs/API_FULL_TEXT.md`. |