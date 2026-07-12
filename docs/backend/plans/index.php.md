# api/plans/index.php

## Статус

| Поле | Значение |
|---|---|
| Backend на хосте | да |
| Код сверено с хостом | да |
| Источник | код с хоста, присланный вручную |
| Подключено на фронте | уточнить |
| Нужны правки backend | нет |
| Нужны правки frontend | уточнить |

## Назначение

Endpoint возвращает список активных тарифов.

Используется:

- в форме создания объекта;
- в личном кабинете;
- при смене тарифа;
- перед созданием платежа.

## Метод и URL

```http
GET /api/plans/index.php
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
    "plans": [
      {
        "id": 1,
        "code": "private_free",
        "title": "Бесплатный",
        "description": "Описание тарифа",
        "max_places": 1,
        "duration_days": 120,
        "price": 0,
        "is_active": 1
      }
    ]
  }
}
```

## Response fields

| Поле | Тип | Описание |
|---|---|---|
| `id` | number | ID тарифа. |
| `code` | string | Код тарифа. |
| `title` | string | Название тарифа. |
| `description` | string/null | Описание тарифа. |
| `max_places` | number | Лимит объявлений. |
| `duration_days` | number/null | Срок действия тарифа в днях. |
| `price` | number | Цена тарифа. |
| `is_active` | number | Активен ли тариф. В ответе возвращаются только активные. |

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `500` | `Не удалось получить тарифы` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint можно использовать для отображения тарифов.
- Тарифы уже отсортированы по цене и ID.
- Если `price = 0`, frontend не должен запускать оплату.
- Если `price > 0`, после выбора тарифа сценарий может привести к созданию платежа.
- `max_places` использовать для отображения лимита объявлений.
- `duration_days` использовать для отображения срока публикации/тарифа.

## Backend notes

- Используется таблица `plans`.
- Возвращаются только активные тарифы:
  - `is_active = 1`.
- Сортировка:
  - `price ASC`;
  - `id ASC`.

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
            id,
            code,
            title,
            description,
            max_places,
            duration_days,
            price,
            is_active
        FROM plans
        WHERE is_active = 1
        ORDER BY price ASC, id ASC
    ");

    successResponse([
        'plans' => $stmt->fetchAll(),
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить тарифы', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Документ структурирован по актуальному коду с хоста. |