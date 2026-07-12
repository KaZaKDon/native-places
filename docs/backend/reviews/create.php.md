# api/reviews/create.php

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

Endpoint создаёт отзыв текущего авторизованного пользователя для опубликованного объекта.

Новый отзыв создаётся со статусом:

```text
pending
```

То есть отзыв отправляется на модерацию.

## Метод и URL

```http
POST /api/reviews/create.php
```

## Авторизация

Требуется user session.

Endpoint вызывает:

```php
$userId = requireAuth();
```

## Request

Тело запроса передаётся в формате JSON.

```json
{
  "place_id": 123,
  "review_text": "Текст отзыва минимум 10 символов"
}
```

## Request fields

| Поле | Тип | Обязательное | Правила |
|---|---|---:|---|
| `place_id` | number | да | ID опубликованного объекта. |
| `review_text` | string | да | Не пустой, минимум 10 символов. |

## Success response

HTTP `201`

```json
{
  "success": true,
  "data": {
    "message": "Отзыв отправлен на модерацию",
    "review_id": 1
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `400` | `Не передан ID объекта` | `place_id` отсутствует или меньше/равен нулю. |
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `404` | `Объект не найден` | Опубликованный объект не найден. |
| `422` | `Введите текст отзыва` | `review_text` пустой. |
| `422` | `Отзыв слишком короткий` | `review_text` короче 10 символов. |
| `422` | `Вы уже оставляли отзыв для этого объекта` | У пользователя уже есть отзыв для этого объекта. |
| `500` | `Не удалось создать отзыв` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint использовать для формы добавления отзыва.
- После успешного ответа показать сообщение, что отзыв отправлен на модерацию.
- Новый отзыв не появится в публичном списке до публикации модератором.
- Если backend вернул ошибку о повторном отзыве, скрыть форму или показать предупреждение.
- На фронте желательно проверять минимум 10 символов до отправки.

## Backend notes

- Используются таблицы:
  - `places`;
  - `reviews`.
- Сначала проверяется, что объект опубликован:
  - `places.status = 'published'`.
- Один пользователь может оставить только один отзыв на объект.
- Новый отзыв создаётся со статусом:
  - `pending`.
- При параллельных запросах возможны дубликаты, если в БД нет уникального индекса на:
  - `(place_id, user_id)`.

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
$reviewText = trim($input['review_text'] ?? '');

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

if ($reviewText === '') {
    errorResponse('Введите текст отзыва', 422);
}

if (mb_strlen($reviewText) < 10) {
    errorResponse('Отзыв слишком короткий', 422);
}

try {

    $pdo = getDatabaseConnection();

    $placeStmt = $pdo->prepare("
        SELECT id
        FROM places
        WHERE id = :place_id
        AND status = 'published'
        LIMIT 1
    ");

    $placeStmt->execute([
        'place_id' => $placeId,
    ]);

    if (!$placeStmt->fetch()) {
        errorResponse('Объект не найден', 404);
    }

    $existsStmt = $pdo->prepare("
        SELECT id
        FROM reviews
        WHERE place_id = :place_id
        AND user_id = :user_id
        LIMIT 1
    ");

    $existsStmt->execute([
        'place_id' => $placeId,
        'user_id' => $userId,
    ]);

    if ($existsStmt->fetch()) {
        errorResponse(
            'Вы уже оставляли отзыв для этого объекта',
            422
        );
    }

    $stmt = $pdo->prepare("
        INSERT INTO reviews (
            place_id,
            user_id,
            review_text,
            status,
            created_at,
            updated_at
        ) VALUES (
            :place_id,
            :user_id,
            :review_text,
            'pending',
            NOW(),
            NOW()
        )
    ");

    $stmt->execute([
        'place_id' => $placeId,
        'user_id' => $userId,
        'review_text' => $reviewText,
    ]);

    successResponse([
        'message' => 'Отзыв отправлен на модерацию',
        'review_id' => (int) $pdo->lastInsertId(),
    ], 201);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось создать отзыв',
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