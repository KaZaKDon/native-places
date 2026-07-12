# api/reports/create.php

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

Endpoint создаёт жалобу текущего авторизованного пользователя на опубликованный объект.

Жалоба создаётся со статусом:

```text
new
```

## Метод и URL

```http
POST /api/reports/create.php
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
  "report_type": "incorrect_info",
  "message": "Описание причины жалобы"
}
```

## Request fields

| Поле | Тип | Обязательное | Правила |
|---|---|---:|---|
| `place_id` | number | да | ID опубликованного объекта. |
| `report_type` | string | да | Тип жалобы. |
| `message` | string | да | Описание причины жалобы. |

## Success response

HTTP `201`

```json
{
  "success": true,
  "data": {
    "message": "Жалоба отправлена",
    "report_id": 1
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `400` | `Не передан ID объекта` | `place_id` отсутствует или меньше/равен нулю. |
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `404` | `Объект не найден` | Опубликованный объект не найден. |
| `422` | `Выберите тип жалобы` | `report_type` пустой. |
| `422` | `Опишите причину жалобы` | `message` пустой. |
| `500` | `Не удалось отправить жалобу` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint использовать для формы жалобы на объект.
- Перед отправкой пользователь должен быть авторизован.
- `report_type` лучше выбирать из фиксированного списка на фронте.
- После успеха показать сообщение «Жалоба отправлена».
- Новый report не требует немедленного отображения в публичной части.

## Backend notes

- Используются таблицы:
  - `places`;
  - `reports`.
- Сначала проверяется, что объект опубликован:
  - `places.status = 'published'`.
- Жалоба создаётся со статусом:
  - `new`.
- В текущем коде нет проверки повторной жалобы от того же пользователя на тот же объект.

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
$reportType = trim($input['report_type'] ?? '');
$message = trim($input['message'] ?? '');

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

if ($reportType === '') {
    errorResponse('Выберите тип жалобы', 422);
}

if ($message === '') {
    errorResponse('Опишите причину жалобы', 422);
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

    $stmt = $pdo->prepare("
        INSERT INTO reports (
            place_id,
            user_id,
            report_type,
            message,
            status,
            created_at,
            updated_at
        ) VALUES (
            :place_id,
            :user_id,
            :report_type,
            :message,
            'new',
            NOW(),
            NOW()
        )
    ");

    $stmt->execute([
        'place_id' => $placeId,
        'user_id' => $userId,
        'report_type' => $reportType,
        'message' => $message,
    ]);

    successResponse([
        'message' => 'Жалоба отправлена',
        'report_id' => (int) $pdo->lastInsertId(),
    ], 201);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось отправить жалобу',
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