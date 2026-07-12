# api/routes/update.php

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

Endpoint обновляет название, описание и публичность активного маршрута текущего пользователя.

Обновить можно только маршрут со статусом:

```text
active
```

## Метод и URL

```http
POST /api/routes/update.php
```

## Авторизация

Требуется user session.

Пользователь может обновить только свой активный маршрут.

## Request

Тело запроса передаётся в формате JSON.

```json
{
  "route_id": 1,
  "title": "Новое название",
  "description": "Новое описание",
  "is_public": true
}
```

## Request fields

| Поле | Тип | Обязательное | Правила |
|---|---|---:|---|
| `route_id` | number | да | ID активного маршрута текущего пользователя. |
| `title` | string | да | Не пустое название маршрута. |
| `description` | string | нет | Описание маршрута. |
| `is_public` | boolean/number | нет | Если значение непустое, маршрут публичный. |

## Success response

HTTP `200`

```json
{
  "success": true,
  "data": {
    "message": "Маршрут обновлён",
    "route_id": 1
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `400` | `Не передан ID маршрута` | `route_id` отсутствует или меньше/равен нулю. |
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `404` | `Активный маршрут не найден или нет доступа` | Маршрут не найден, не принадлежит пользователю или не активен. |
| `422` | `Введите название маршрута` | `title` пустой. |
| `500` | `Не удалось обновить маршрут` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Использовать для формы редактирования маршрута.
- После успеха обновить маршрут локально или перезагрузить `show.php`.
- Если маршрут завершён или архивный, backend не даст его обновить.
- `is_public` отвечает за публичность маршрута, но публичная ссылка также зависит от `share_token`.

## Backend notes

- Используется таблица `routes`.
- Обновить можно только:
  - свой маршрут;
  - со статусом `active`.
- Пустое описание сохраняется как `null`.
- Обновляется `updated_at`.

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

$routeId = (int) ($input['route_id'] ?? 0);
$title = trim($input['title'] ?? '');
$description = trim($input['description'] ?? '');
$isPublic = !empty($input['is_public']) ? 1 : 0;

if ($routeId <= 0) {
errorResponse('Не передан ID маршрута', 400);
}

if ($title === '') {
errorResponse('Введите название маршрута', 422);
}

try {

$pdo = getDatabaseConnection();

$routeStmt = $pdo->prepare("
SELECT id
FROM routes
WHERE id = :route_id
AND user_id = :user_id
AND status = 'active'
LIMIT 1
");

$routeStmt->execute([
'route_id' => $routeId,
'user_id' => $userId,
]);

$route = $routeStmt->fetch();

if (!$route) {
errorResponse('Активный маршрут не найден или нет доступа', 404);
}

$updateStmt = $pdo->prepare("
UPDATE routes
SET
title = :title,
description = :description,
is_public = :is_public,
updated_at = NOW()
WHERE id = :route_id
LIMIT 1
");

$updateStmt->execute([
'title' => $title,
'description' => $description !== '' ? $description : null,
'is_public' => $isPublic,
'route_id' => $routeId,
]);

successResponse([
'message' => 'Маршрут обновлён',
'route_id' => $routeId,
]);

} catch (Throwable $e) {

errorResponse(
'Не удалось обновить маршрут',
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