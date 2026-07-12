# api/appeals/my.php

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

Endpoint возвращает обращения текущего авторизованного пользователя.

Используется в личном кабинете для раздела поддержки/идей/обращений.

## Метод и URL

```http
GET /api/appeals/my.php
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
    "appeals": [
      {
        "id": 1,
        "user_id": 10,
        "appeal_type": "support",
        "contact": "user@example.com",
        "message": "Текст обращения",
        "admin_response": null,
        "status": "new",
        "created_at": "2026-07-04 10:00:00",
        "updated_at": "2026-07-04 10:00:00",
        "closed_at": null
      }
    ]
  }
}
```

## Response fields

| Поле | Тип | Описание |
|---|---|---|
| `id` | number | ID обращения. |
| `user_id` | number | ID пользователя. |
| `appeal_type` | string | Тип обращения. |
| `contact` | string/null | Контакт для ответа. |
| `message` | string | Текст обращения. |
| `admin_response` | string/null | Ответ администратора. |
| `status` | string | Статус обращения. |
| `created_at` | string | Дата создания. |
| `updated_at` | string | Дата обновления. |
| `closed_at` | string/null | Дата закрытия. |

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `500` | `Не удалось получить обращения` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint использовать для списка обращений пользователя.
- Если `appeals` пустой, показать empty state.
- `admin_response` показывать как ответ поддержки, если он есть.
- `status` использовать для бейджа состояния обращения.
- Список уже отсортирован от новых к старым.

## Backend notes

- Используется таблица `appeals`.
- Выборка идёт только по текущему пользователю:
  - `user_id = :user_id`.
- Сортировка:
  - `created_at DESC`;
  - `id DESC`.

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
            id,
            user_id,
            appeal_type,
            contact,
            message,
            admin_response,
            status,
            created_at,
            updated_at,
            closed_at
        FROM appeals
        WHERE user_id = :user_id
        ORDER BY created_at DESC, id DESC
    ");

    $stmt->execute([
        'user_id' => $userId,
    ]);

    successResponse([
        'appeals' => $stmt->fetchAll(),
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
| 2026-07-04 | Документ структурирован из `docs/API_FULL_TEXT.md`. |