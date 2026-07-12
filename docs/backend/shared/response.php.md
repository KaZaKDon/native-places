# api/shared/response.php

## Статус

| Поле | Значение |
|---|---|
| Backend на хосте | да |
| Код сверено с хостом | да |
| Источник | `docs/API_FULL_TEXT.md` |
| Подключено на фронте | используется всеми API endpoint-ами |
| Нужны правки backend | нет |
| Нужны правки frontend | нет |

## Назначение

Файл содержит helper-функции для отправки JSON-ответов.

Основные функции:

```php
jsonResponse()
successResponse()
errorResponse()
```

## `jsonResponse()`

Базовая функция отправки JSON-ответа.

```php
jsonResponse(array $data, int $statusCode = 200): void
```

Что делает:

1. Устанавливает HTTP-статус.
2. Устанавливает header:

```http
Content-Type: application/json; charset=utf-8
```

3. Кодирует массив в JSON.
4. Завершает выполнение через `exit`.

## `successResponse()`

Функция успешного ответа.

```php
successResponse(array $data = [], int $statusCode = 200): void
```

Формат:

```json
{
  "success": true,
  "data": {}
}
```

## `errorResponse()`

Функция ошибочного ответа.

```php
errorResponse(string $message, int $statusCode = 400, array $extra = []): void
```

Формат:

```json
{
  "success": false,
  "message": "Текст ошибки",
  "extra": {}
}
```

## Frontend notes

- Все endpoint-ы возвращают единый формат.
- Для успешного ответа проверять:

```ts
response.success === true
```

- Для ошибки проверять:

```ts
response.success === false
```

- `message` можно показывать пользователю.
- `extra.errors` можно использовать для ошибок формы.

## Backend notes

- После вызова `successResponse()` или `errorResponse()` код дальше не выполняется, потому что внутри вызывается `exit`.
- JSON кодируется с флагами:
  - `JSON_UNESCAPED_UNICODE`;
  - `JSON_UNESCAPED_SLASHES`.

## PHP-код

```php
<?php

function jsonResponse(array $data, int $statusCode = 200): void
{
    http_response_code($statusCode);

    header('Content-Type: application/json; charset=utf-8');

    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    exit;
}

function successResponse(array $data = [], int $statusCode = 200): void
{
    jsonResponse([
        'success' => true,
        'data' => $data,
    ], $statusCode);
}

function errorResponse(string $message, int $statusCode = 400, array $extra = []): void
{
    jsonResponse([
        'success' => false,
        'message' => $message,
        'extra' => $extra,
    ], $statusCode);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Документ структурирован из `docs/API_FULL_TEXT.md`. |