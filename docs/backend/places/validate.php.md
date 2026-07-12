# api/places/validate.php

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

Endpoint выполняет базовую валидацию данных объекта.

Он не создаёт объект и не обращается к базе данных. Endpoint проверяет только формат и обязательность части полей.

## Метод и URL

```http
POST /api/places/validate.php
```

## Авторизация

Не требуется.

Endpoint публичный.

## Request

Тело запроса передаётся в формате JSON.

```json
{
  "title": "Название объекта",
  "category": "culture",
  "type": "museum",
  "booking_type": "external",
  "publication_type": "free",
  "is_commercial": 0
}
```

## Request fields

| Поле | Тип | Обязательное | Правила |
|---|---|---:|---|
| `title` | string | да | Не пустое. |
| `category` | string | да | Не пустое, только `a-z`, `0-9`, `_`, `-`. |
| `type` | string | да | Не пустое, только `a-z`, `0-9`, `_`, `-`. |
| `booking_type` | string | нет | Если передан: `chat`, `phone`, `external`. |
| `publication_type` | string | нет | Если передан: `free`, `paid`. |
| `is_commercial` | number/null | нет | Если передан: `0` или `1`. |

## Success response

HTTP `200`

```json
{
  "success": true,
  "data": {
    "message": "Проверка пройдена"
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `400` | `Некорректный JSON` | Тело запроса не является JSON-объектом. |
| `422` | `Обнаружены ошибки валидации` | Одно или несколько полей не прошли проверку. |

## Validation details

Пример ошибки:

```json
{
  "success": false,
  "message": "Обнаружены ошибки валидации",
  "extra": {
    "errors": {
      "title": "Введите название объекта",
      "category": "Выберите категорию",
      "type": "Выберите тип объекта",
      "booking_type": "Некорректный тип бронирования",
      "publication_type": "Некорректный тип размещения",
      "is_commercial": "Некорректный тип объекта"
    }
  }
}
```

## Frontend notes

- Endpoint можно использовать для предварительной проверки формы.
- Он не заменяет полноценное создание объекта через `api/my-places/create.php`.
- Он не проверяет существование категории/типа в базе данных.
- Для создания объекта нужно использовать `api/my-places/create.php`.
- Если frontend уже валидирует эти поля самостоятельно, этот endpoint может быть необязательным.

## Backend notes

- Endpoint не подключает `database.php`.
- Проверяется только JSON и базовые значения.
- `category` и `type` проверяются регулярным выражением:
  - `^[a-z0-9_-]+$`.
- `booking_type` допускает:
  - `chat`;
  - `phone`;
  - `external`.
- `publication_type` допускает:
  - `free`;
  - `paid`.
- `is_commercial` допускает:
  - `0`;
  - `1`.

## PHP-код

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    errorResponse('Некорректный JSON', 400);
}

$title = trim($input['title'] ?? '');
$category = trim($input['category'] ?? '');
$type = trim($input['type'] ?? '');
$bookingType = trim($input['booking_type'] ?? '');
$publicationType = trim($input['publication_type'] ?? '');
$isCommercial = $input['is_commercial'] ?? null;

$errors = [];

if ($title === '') {
    $errors['title'] = 'Введите название объекта';
}

if ($category === '') {
    $errors['category'] = 'Выберите категорию';
} elseif (!preg_match('/^[a-z0-9_-]+$/', $category)) {
    $errors['category'] = 'Некорректная категория';
}

if ($type === '') {
    $errors['type'] = 'Выберите тип объекта';
} elseif (!preg_match('/^[a-z0-9_-]+$/', $type)) {
    $errors['type'] = 'Некорректный тип объекта';
}

if ($bookingType !== '' && !in_array($bookingType, ['chat', 'phone', 'external'], true)) {
    $errors['booking_type'] = 'Некорректный тип бронирования';
}

if ($publicationType !== '' && !in_array($publicationType, ['free', 'paid'], true)) {
    $errors['publication_type'] = 'Некорректный тип размещения';
}

if ($isCommercial !== null && !in_array((int) $isCommercial, [0, 1], true)) {
    $errors['is_commercial'] = 'Некорректный тип объекта';
}

if (!empty($errors)) {
    errorResponse('Обнаружены ошибки валидации', 422, [
        'errors' => $errors,
    ]);
}

successResponse([
    'message' => 'Проверка пройдена',
]);
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Документ структурирован из `php-after-changes/api-places-updated.md`. |