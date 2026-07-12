# api/places/types-by-category.php

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

Endpoint возвращает активные типы объектов для выбранной категории.

Категория передаётся по коду категории.

## Метод и URL

```http
GET /api/places/types-by-category.php?category={category_code}
```

## Авторизация

Не требуется.

Endpoint публичный.

## Query params

| Параметр | Тип | Обязательный | Правила |
|---|---|---:|---|
| `category` | string | да | Код категории. Допустимы только `a-z`, `0-9`, `_`, `-`. |

## Success response

HTTP `200`

```json
{
  "success": true,
  "data": {
    "types": [
      {
        "id": 1,
        "category_id": 2,
        "code": "museum",
        "title": "Музей",
        "sort_order": 1,
        "category_code": "culture",
        "category_title": "Культура"
      }
    ]
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `400` | `Не передан код категории` | Query-параметр `category` отсутствует или пустой. |
| `422` | `Некорректный код категории` | Код категории содержит недопустимые символы. |
| `500` | `Не удалось получить типы объектов` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint можно использовать для динамического обновления списка типов после выбора категории.
- Если `types` пустой, для выбранной категории нет активных типов.
- На фронте желательно не отправлять пустой `category`.
- Если типы уже загружены через `filters.php` или `create-options.php`, отдельный вызов может быть не нужен.

## Backend notes

- Используются таблицы:
  - `place_types`;
  - `categories`.
- Возвращаются только активные категории:
  - `c.is_active = 1`.
- Возвращаются только активные типы:
  - `pt.is_active = 1`.
- Сортировка:
  - `pt.sort_order ASC`;
  - `pt.title ASC`.

## PHP-код

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

$category = trim($_GET['category'] ?? '');

if ($category === '') {
    errorResponse('Не передан код категории', 400);
}

if (!preg_match('/^[a-z0-9_-]+$/', $category)) {
    errorResponse('Некорректный код категории', 422);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            pt.id,
            pt.category_id,
            pt.code,
            pt.title,
            pt.sort_order,
            c.code AS category_code,
            c.title AS category_title
        FROM place_types pt
        INNER JOIN categories c ON c.id = pt.category_id
        WHERE c.code = :category
        AND c.is_active = 1
        AND pt.is_active = 1
        ORDER BY pt.sort_order ASC, pt.title ASC
    ");

    $stmt->execute([
        'category' => $category,
    ]);

    successResponse([
        'types' => $stmt->fetchAll(),
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить типы объектов', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Документ структурирован из `php-after-changes/api-places-updated.md`. |