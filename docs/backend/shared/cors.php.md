# api/shared/cors.php

## Статус

| Поле | Значение |
|---|---|
| Backend на хосте | да |
| Код сверено с хостом | да |
| Источник | `docs/API_FULL_TEXT.md` |
| Подключено на фронте | используется всеми API-запросами |
| Нужны правки backend | нет |
| Нужны правки frontend | нет |

## Назначение

Файл настраивает CORS для PHP API.

Он подключается в endpoint-ах до отправки JSON-ответа:

```php
require_once __DIR__ . '/../shared/cors.php';
```

или из других вложенных директорий с соответствующим относительным путём.

## Разрешённые origins

```text
https://native-places.ru
http://localhost:5173
http://localhost:5174
```

## Разрешённые методы

```text
GET
POST
PUT
PATCH
DELETE
OPTIONS
```

## Разрешённые headers

```text
Content-Type
Authorization
```

## Credentials

Файл включает поддержку cookie/session:

```http
Access-Control-Allow-Credentials: true
```

Это нужно, потому что пользовательская и админская авторизация работают через PHP session cookie.

## OPTIONS-запросы

Если backend получает preflight-запрос:

```http
OPTIONS
```

он возвращает:

```http
204 No Content
```

и завершает выполнение.

## Frontend notes

- Для `fetch` нужно использовать:

```ts
fetch(url, {
  credentials: 'include'
});
```

- Для `axios` нужно использовать:

```ts
axios.create({
  withCredentials: true
});
```

- Если credentials не передавать, PHP-сессия не будет работать стабильно.

## Backend notes

- `Access-Control-Allow-Origin` отдаётся только если `HTTP_ORIGIN` входит в список разрешённых.
- Не используется wildcard `*`, что правильно при `Access-Control-Allow-Credentials: true`.
- CORS-файл должен подключаться до любого вывода в ответ.

## PHP-код

```php
<?php

$allowedOrigins = [
    'https://native-places.ru',
    'http://localhost:5173',
    'http://localhost:5174',
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: {$origin}");
}

header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Документ структурирован из `docs/API_FULL_TEXT.md`. |