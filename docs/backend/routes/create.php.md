# api/routes/create.php

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

Endpoint создаёт новый маршрут текущего авторизованного пользователя.

При создании генерируется `share_token` для публичной ссылки.

## Метод и URL

```http
POST /api/routes/create.php
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
  "title": "Маршрут выходного дня",
  "description": "Описание маршрута",
  "is_public": true
}
```

## Request fields

| Поле | Тип | Обязательное | Правила |
|---|---|---:|---|
| `title` | string | да | Не пустое название маршрута. |
| `description` | string | нет | Описание маршрута. |
| `is_public` | boolean/number | нет | Если значение непустое, маршрут создаётся публичным. |

## Success response

HTTP `201`

```json
{
  "success": true,
  "data": {
    "message": "Маршрут успешно создан",
    "route": {
      "id": 1,
      "title": "Маршрут выходного дня",
      "description": "Описание маршрута",
      "is_public": true,
      "share_token": "abc123"
    }
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `422` | `Введите название маршрута` | Поле `title` пустое. |
| `500` | `Не удалось создать маршрут` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint использовать для формы создания маршрута.
- После успешного создания можно перейти на страницу маршрута.
- `share_token` можно использовать для построения публичной ссылки.
- Если `is_public = true`, маршрут может быть доступен по публичной ссылке.

## Backend notes

- Используется таблица `routes`.
- `share_token` генерируется через:
  - `bin2hex(random_bytes(16))`.
- Пустое описание сохраняется как `null`.
- `is_public` приводится к `1` или `0`.

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

$title = trim($input['title'] ?? '');
$description = trim($input['description'] ?? '');
$isPublic = !empty($input['is_public']) ? 1 : 0;

if ($title === '') {
    errorResponse('Введите название маршрута', 422);
}

try {

    $pdo = getDatabaseConnection();

    $shareToken = bin2hex(random_bytes(16));

    $stmt = $pdo->prepare("
        INSERT INTO routes (
            user_id,
            title,
            description,
            is_public,
            share_token,
            created_at,
            updated_at
        ) VALUES (
            :user_id,
            :title,
            :description,
            :is_public,
            :share_token,
            NOW(),
            NOW()
        )
    ");

    $stmt->execute([
        'user_id' => $userId,
        'title' => $title,
        'description' => $description !== '' ? $description : null,
        'is_public' => $isPublic,
        'share_token' => $shareToken,
    ]);

    $routeId = (int) $pdo->lastInsertId();

    successResponse([
        'message' => 'Маршрут успешно создан',
        'route' => [
            'id' => $routeId,
            'title' => $title,
            'description' => $description !== '' ? $description : null,
            'is_public' => (bool) $isPublic,
            'share_token' => $shareToken,
        ],
    ], 201);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось создать маршрут',
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