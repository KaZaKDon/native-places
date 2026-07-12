# api/place-attributes/index.php

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

Endpoint возвращает сохранённые характеристики объекта текущего пользователя.

Используется при открытии формы редактирования объекта.

## Метод и URL

```http
GET /api/place-attributes/index.php?place_id={id}
```

## Авторизация

Требуется user session.

Пользователь может получить характеристики только своего объекта.

## Query params

| Параметр | Тип | Обязательный | Описание |
|---|---|---:|---|
| `place_id` | number | да | ID объекта текущего пользователя. |

## Success response

HTTP `200`

```json
{
  "success": true,
  "data": {
    "place_id": 123,
    "attributes": [
      {
        "id": 1,
        "attribute_definition_id": 10,
        "value": "Да",
        "code": "parking",
        "title": "Парковка",
        "field_type": "select",
        "is_required": 0,
        "is_filterable": 1
      }
    ]
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `400` | `Не передан ID объекта` | `place_id` отсутствует или меньше/равен нулю. |
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `404` | `Объект не найден или нет доступа` | Объект не найден или не принадлежит пользователю. |
| `500` | `Не удалось получить характеристики объекта` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint использовать для заполнения значений характеристик в форме редактирования.
- Для полного построения формы обычно нужно совместить:
  - `definitions.php` — список возможных характеристик категории;
  - `index.php` — сохранённые значения объекта.
- Если `attributes` пустой, у объекта ещё нет сохранённых характеристик.

## Backend notes

- Используются таблицы:
  - `places`;
  - `place_attributes`;
  - `attribute_definitions`.
- Сначала проверяется доступ к объекту:
  - `places.id`;
  - `places.user_id`.
- Характеристики сортируются по:
  - `ad.sort_order ASC`;
  - `ad.id ASC`.

## PHP-код

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$placeId = (int) ($_GET['place_id'] ?? 0);

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

try {

    $pdo = getDatabaseConnection();

    $placeStmt = $pdo->prepare("
        SELECT
            id,
            category_id
        FROM places
        WHERE id = :id
        AND user_id = :user_id
        LIMIT 1
    ");

    $placeStmt->execute([
        'id' => $placeId,
        'user_id' => $userId,
    ]);

    $place = $placeStmt->fetch();

    if (!$place) {
        errorResponse('Объект не найден или нет доступа', 404);
    }

    $stmt = $pdo->prepare("
        SELECT
            pa.id,
            pa.attribute_definition_id,
            pa.value,

            ad.code,
            ad.title,
            ad.field_type,
            ad.is_required,
            ad.is_filterable

        FROM place_attributes pa

        INNER JOIN attribute_definitions ad
            ON ad.id = pa.attribute_definition_id

        WHERE pa.place_id = :place_id

        ORDER BY ad.sort_order ASC, ad.id ASC
    ");

    $stmt->execute([
        'place_id' => $placeId,
    ]);

    $attributes = $stmt->fetchAll();

    successResponse([
        'place_id' => $placeId,
        'attributes' => $attributes,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось получить характеристики объекта',
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