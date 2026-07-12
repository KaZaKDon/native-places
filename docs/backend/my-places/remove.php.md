# api/my-places/remove.php

## Статус

| Поле | Значение |
|---|---|
| Backend на хосте | да |
| Код сверено с хостом | да |
| Источник | `php-after-changes/api-my-places-updated.md` |
| Подключено на фронте | уточнить |
| Нужны правки backend | нет |
| Нужны правки frontend | уточнить |

## Назначение

Endpoint окончательно удаляет объявление из архива.

Удалить навсегда можно только объявление со статусом:

```text
expired
```

В отличие от `delete.php`, этот endpoint физически удаляет запись из `places` и связанные данные.

## Метод и URL

```http
POST /api/my-places/remove.php
```

## Авторизация

Требуется user session.

Endpoint вызывает:

```php
$userId = requireAuth();
```

Пользователь может удалить только своё объявление.

## Request

Тело запроса передаётся в формате JSON.

```json
{
  "place_id": 123
}
```

## Request fields

| Поле | Тип | Обязательное | Правила |
|---|---|---:|---|
| `place_id` | number | да | ID архивного объявления текущего пользователя. |

## Success response

HTTP `200`

```json
{
  "success": true,
  "data": {
    "message": "Объявление удалено из архива",
    "place_id": 123,
    "title": "Название объявления"
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `400` | `Некорректный JSON` | Тело запроса не является JSON-объектом. |
| `400` | `Не передан ID объекта` | `place_id` отсутствует или меньше/равен нулю. |
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `404` | `Объявление не найдено или нет доступа` | Объявление не найдено или не принадлежит текущему пользователю. |
| `422` | `Удалить навсегда можно только объявление из архива` | Статус объявления не `expired`. |
| `500` | `Не удалось удалить объявление из архива` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint используется для действия «Удалить навсегда» в архиве.
- Перед вызовом желательно показать пользователю confirm modal.
- После успешного удаления нужно убрать объект из списка локально или перезагрузить список.
- Действие необратимое.
- Если объект не в архиве, backend вернёт `422`.
- При `401` отправить пользователя на login.

## Backend notes

- Используются таблицы:
  - `places`;
  - `favorites`;
  - `place_attributes`;
  - `place_images`.
- Удаление доступно только для:
  - `places.status = 'expired'`;
  - текущего `user_id`.
- Операция выполняется в транзакции.
- Сначала удаляются связанные записи:
  - `favorites`;
  - `place_attributes`;
  - `place_images`.
- Затем удаляется сама запись из `places`.
- При исключении транзакция откатывается через `rollBack()`.

## PHP-код

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    errorResponse('Некорректный JSON', 400);
}

$placeId = (int) ($input['place_id'] ?? 0);

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

try {
    $pdo = getDatabaseConnection();

    $placeStmt = $pdo->prepare("
        SELECT
            id,
            title,
            status
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
        errorResponse('Объявление не найдено или нет доступа', 404);
    }

    if ($place['status'] !== 'expired') {
        errorResponse('Удалить навсегда можно только объявление из архива', 422);
    }

    $pdo->beginTransaction();

    $pdo->prepare("DELETE FROM favorites WHERE place_id = :place_id")->execute([
        'place_id' => $placeId,
    ]);

    $pdo->prepare("DELETE FROM place_attributes WHERE place_id = :place_id")->execute([
        'place_id' => $placeId,
    ]);

    $pdo->prepare("DELETE FROM place_images WHERE place_id = :place_id")->execute([
        'place_id' => $placeId,
    ]);

    $deleteStmt = $pdo->prepare("
        DELETE FROM places
        WHERE id = :id
        AND user_id = :user_id
        AND status = 'expired'
        LIMIT 1
    ");

    $deleteStmt->execute([
        'id' => $placeId,
        'user_id' => $userId,
    ]);

    $pdo->commit();

    successResponse([
        'message' => 'Объявление удалено из архива',
        'place_id' => $placeId,
        'title' => $place['title'],
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось удалить объявление из архива', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Документ структурирован из `php-after-changes/api-my-places-updated.md`. |