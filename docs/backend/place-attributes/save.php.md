# api/place-attributes/save.php

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

Endpoint сохраняет характеристики объекта текущего пользователя.

Для каждого переданного атрибута backend:

1. Проверяет, что определение характеристики относится к категории объекта.
2. Удаляет старое значение.
3. Если новое значение не пустое — вставляет новую запись.

## Метод и URL

```http
POST /api/place-attributes/save.php
```

## Авторизация

Требуется user session.

Пользователь может сохранять характеристики только для своего объекта.

## Request

Тело запроса передаётся в формате JSON.

```json
{
  "place_id": 123,
  "attributes": [
    {
      "attribute_definition_id": 10,
      "value": "Да"
    },
    {
      "attribute_definition_id": 11,
      "value": "100"
    }
  ]
}
```

## Request fields

| Поле | Тип | Обязательное | Правила |
|---|---|---:|---|
| `place_id` | number | да | ID объекта текущего пользователя. |
| `attributes` | array | да | Массив характеристик. |
| `attributes[].attribute_definition_id` | number | да | ID определения характеристики. |
| `attributes[].value` | string | нет | Значение характеристики. Если пустое — значение удаляется/не сохраняется. |

## Success response

HTTP `200`

```json
{
  "success": true,
  "data": {
    "message": "Характеристики объекта сохранены",
    "place_id": 123
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `400` | `Не передан ID объекта` | `place_id` отсутствует или меньше/равен нулю. |
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `404` | `Объект не найден или нет доступа` | Объект не найден или не принадлежит пользователю. |
| `422` | `Некорректный формат характеристик` | `attributes` не является массивом. |
| `500` | `Не удалось сохранить характеристики объекта` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint использовать после заполнения характеристик объекта.
- Передавать можно полный массив значений формы.
- Если значение пустое, backend удалит старое значение и не вставит новое.
- Перед сохранением желательно получить список определений через `definitions.php`.
- После успешного сохранения можно перейти к следующему шагу формы или показать toast.

## Backend notes

- Используются таблицы:
  - `places`;
  - `attribute_definitions`;
  - `place_attributes`.
- Сначала проверяется доступ к объекту.
- Для каждого атрибута проверяется:
  - определение существует;
  - определение относится к категории объекта;
  - определение активно.
- Старое значение удаляется всегда перед вставкой нового.
- Если значение пустое, новая запись не создаётся.
- Операция выполняется в транзакции.
- В текущем коде нет отдельной проверки обязательных `is_required` атрибутов.

## PHP-код

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(
    file_get_contents('php://input'),
    true
);

$placeId = (int) ($input['place_id'] ?? 0);
$attributes = $input['attributes'] ?? [];

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

if (!is_array($attributes)) {
    errorResponse('Некорректный формат характеристик', 422);
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

    $pdo->beginTransaction();

    foreach ($attributes as $attribute) {
        $definitionId = (int) ($attribute['attribute_definition_id'] ?? 0);
        $value = trim((string) ($attribute['value'] ?? ''));

        if ($definitionId <= 0) {
            continue;
        }

        $definitionStmt = $pdo->prepare("
            SELECT id
            FROM attribute_definitions
            WHERE id = :id
            AND category_id = :category_id
            AND is_active = 1
            LIMIT 1
        ");

        $definitionStmt->execute([
            'id' => $definitionId,
            'category_id' => $place['category_id'],
        ]);

        $definition = $definitionStmt->fetch();

        if (!$definition) {
            continue;
        }

        $deleteStmt = $pdo->prepare("
            DELETE FROM place_attributes
            WHERE place_id = :place_id
            AND attribute_definition_id = :attribute_definition_id
        ");

        $deleteStmt->execute([
            'place_id' => $placeId,
            'attribute_definition_id' => $definitionId,
        ]);

        if ($value === '') {
            continue;
        }

        $insertStmt = $pdo->prepare("
            INSERT INTO place_attributes (
                place_id,
                attribute_definition_id,
                value,
                created_at,
                updated_at
            ) VALUES (
                :place_id,
                :attribute_definition_id,
                :value,
                NOW(),
                NOW()
            )
        ");

        $insertStmt->execute([
            'place_id' => $placeId,
            'attribute_definition_id' => $definitionId,
            'value' => $value,
        ]);
    }

    $pdo->commit();

    successResponse([
        'message' => 'Характеристики объекта сохранены',
        'place_id' => $placeId,
    ]);

} catch (Throwable $e) {

    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse(
        'Не удалось сохранить характеристики объекта',
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