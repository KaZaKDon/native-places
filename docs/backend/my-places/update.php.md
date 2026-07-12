# api/my-places/update.php

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

Endpoint обновляет объект/объявление текущего авторизованного пользователя.

После успешного обновления объект снова отправляется на модерацию:

```text
status = pending
```

Редактировать нельзя объект, который находится в архиве:

```text
status = expired
```

## Метод и URL

```http
POST /api/my-places/update.php
```

## Авторизация

Требуется user session.

Endpoint вызывает:

```php
$userId = requireAuth();
```

Пользователь может обновить только свой объект.

## Request

Тело запроса передаётся в формате JSON.

```json
{
  "id": 123,
  "title": "Название объекта",
  "short_description": "Краткое описание",
  "full_description": "Полное описание",
  "address": "Адрес",
  "latitude": 47.222,
  "longitude": 39.718,
  "locality_id": 1,
  "contact_name": "Имя",
  "phone": "+79990000000",
  "telegram": "@username",
  "email": "user@example.com",
  "website": "https://example.com",
  "booking_type": "external",
  "booking_url": "https://booking.example.com"
}
```

## Request fields

| Поле | Тип | Обязательное | Правила |
|---|---|---:|---|
| `id` | number | да | ID объекта текущего пользователя. |
| `title` | string | да | Не пустое, максимум 255 символов. |
| `short_description` | string | нет | Краткое описание. |
| `full_description` | string | нет | Полное описание. |
| `address` | string | нет | Адрес. |
| `latitude` | number/string | да | Число от `-90` до `90`. |
| `longitude` | number/string | да | Число от `-180` до `180`. |
| `locality_id` | number | да | ID активного населённого пункта. |
| `contact_name` | string | нет | Контактное имя. |
| `phone` | string | нет | Телефон. |
| `telegram` | string | нет | Telegram. |
| `email` | string | нет | Если передан, должен быть валидным email. |
| `website` | string | нет | Если передан, должен быть валидным URL. |
| `booking_type` | string | нет | Допустимые значения: `chat`, `phone`, `external`. |
| `booking_url` | string | нет | Если передан, должен быть валидным URL. |

## Success response

HTTP `200`

```json
{
  "success": true,
  "data": {
    "message": "Объект успешно обновлён и отправлен на модерацию",
    "place_id": 123,
    "locality_id": 1,
    "status": "pending"
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `400` | `Некорректный JSON` | Тело запроса не является JSON-объектом. |
| `400` | `Не передан ID объекта` | `id` отсутствует или меньше/равен нулю. |
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `404` | `Объект не найден или нет доступа` | Объект не найден или не принадлежит текущему пользователю. |
| `422` | `Ошибка валидации` | Ошибки заполнения формы. |
| `422` | `Снятый с публикации объект нельзя редактировать` | Объект имеет статус `expired`. |
| `422` | `Населённый пункт не найден или отключён` | `locality_id` не найден или неактивен. |
| `422` | `Некорректная широта` | Широта не входит в диапазон от `-90` до `90`. |
| `422` | `Некорректная долгота` | Долгота не входит в диапазон от `-180` до `180`. |
| `500` | `Не удалось обновить объект` | Неожиданная ошибка backend-а или базы данных. |

## Validation details

Пример ошибки валидации:

```json
{
  "success": false,
  "message": "Ошибка валидации",
  "extra": {
    "errors": {
      "title": "Введите название объекта",
      "locality_id": "Выберите населённый пункт",
      "latitude": "Укажите точку на карте",
      "longitude": "Укажите точку на карте",
      "email": "Некорректный email",
      "website": "Некорректный сайт",
      "booking_url": "Некорректная ссылка для бронирования",
      "booking_type": "Некорректный способ бронирования"
    }
  }
}
```

## Booking types

Допустимые значения `booking_type`:

| Значение | Описание |
|---|---|
| `chat` | Бронирование/связь через чат. |
| `phone` | Бронирование/связь по телефону. |
| `external` | Внешняя ссылка бронирования. |

Пустое значение допускается и сохраняется как `null`.

## Frontend notes

- Endpoint используется для формы редактирования объекта.
- Перед отправкой нужно передать `id`.
- После успешного обновления объект становится `pending`, то есть снова уходит на модерацию.
- Если объект был `published`, после редактирования он перестаёт быть опубликованным до повторной модерации.
- Если объект `expired`, редактирование запрещено.
- Координаты обязательны: пользователь должен выбрать точку на карте.
- На фронте желательно заранее валидировать:
  - email;
  - website;
  - booking_url;
  - координаты;
  - booking_type.
- При `422` ошибки нужно привязать к полям формы.
- При `401` отправить пользователя на login.

## Backend notes

- Используются таблицы:
  - `places`;
  - `localities`.
- Endpoint проверяет, что объект принадлежит текущему пользователю.
- Архивный объект (`expired`) нельзя редактировать.
- Проверяется активность населённого пункта:
  - `localities.is_active = 1`.
- Координаты нормализуются в float.
- Пустые необязательные строки сохраняются как `null`.
- После обновления сбрасывается модерация:
  - `status = 'pending'`;
  - `moderated_at = NULL`;
  - `updated_at = NOW()`.
- Категория и тип объекта в этом endpoint-е не меняются.
- Изображения и дополнительные атрибуты в этом endpoint-е не обновляются.

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

$placeId = (int) ($input['id'] ?? 0);

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

$title = trim($input['title'] ?? '');
$shortDescription = trim($input['short_description'] ?? '');
$fullDescription = trim($input['full_description'] ?? '');
$address = trim($input['address'] ?? '');
$latitude = $input['latitude'] ?? null;
$longitude = $input['longitude'] ?? null;
$localityId = (int) ($input['locality_id'] ?? 0);
$contactName = trim($input['contact_name'] ?? '');
$phone = trim($input['phone'] ?? '');
$telegram = trim($input['telegram'] ?? '');
$email = trim($input['email'] ?? '');
$website = trim($input['website'] ?? '');
$bookingType = trim($input['booking_type'] ?? '');
$bookingUrl = trim($input['booking_url'] ?? '');

$errors = [];

if ($title === '') {
    $errors['title'] = 'Введите название объекта';
} elseif (mb_strlen($title) > 255) {
    $errors['title'] = 'Название объекта слишком длинное';
}

if ($localityId <= 0) {
    $errors['locality_id'] = 'Выберите населённый пункт';
}

if ($latitude === null || $latitude === '') {
    $errors['latitude'] = 'Укажите точку на карте';
} elseif (!is_numeric($latitude)) {
    $errors['latitude'] = 'Некорректная широта';
}

if ($longitude === null || $longitude === '') {
    $errors['longitude'] = 'Укажите точку на карте';
} elseif (!is_numeric($longitude)) {
    $errors['longitude'] = 'Некорректная долгота';
}

if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'Некорректный email';
}

if ($website !== '' && !filter_var($website, FILTER_VALIDATE_URL)) {
    $errors['website'] = 'Некорректный сайт';
}

if ($bookingUrl !== '' && !filter_var($bookingUrl, FILTER_VALIDATE_URL)) {
    $errors['booking_url'] = 'Некорректная ссылка для бронирования';
}

$allowedBookingTypes = [
    'chat',
    'phone',
    'external',
];

if ($bookingType !== '' && !in_array($bookingType, $allowedBookingTypes, true)) {
    $errors['booking_type'] = 'Некорректный способ бронирования';
}

if (!empty($errors)) {
    errorResponse('Ошибка валидации', 422, [
        'errors' => $errors,
    ]);
}

try {
    $pdo = getDatabaseConnection();

    $placeStmt = $pdo->prepare("
        SELECT
            id,
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
        errorResponse('Объект не найден или нет доступа', 404);
    }

    if ($place['status'] === 'expired') {
        errorResponse('Снятый с публикации объект нельзя редактировать', 422);
    }

    $localityStmt = $pdo->prepare("
        SELECT id
        FROM localities
        WHERE id = :id
        AND is_active = 1
        LIMIT 1
    ");

    $localityStmt->execute([
        'id' => $localityId,
    ]);

    if (!$localityStmt->fetch()) {
        errorResponse('Населённый пункт не найден или отключён', 422, [
            'errors' => [
                'locality_id' => 'Выберите населённый пункт из списка',
            ],
        ]);
    }

    $normalizedLatitude = (float) $latitude;
    $normalizedLongitude = (float) $longitude;

    if ($normalizedLatitude < -90 || $normalizedLatitude > 90) {
        errorResponse('Некорректная широта', 422, [
            'errors' => [
                'latitude' => 'Широта должна быть от -90 до 90',
            ],
        ]);
    }

    if ($normalizedLongitude < -180 || $normalizedLongitude > 180) {
        errorResponse('Некорректная долгота', 422, [
            'errors' => [
                'longitude' => 'Долгота должна быть от -180 до 180',
            ],
        ]);
    }

    $updateStmt = $pdo->prepare("
        UPDATE places
        SET
            title = :title,
            short_description = :short_description,
            full_description = :full_description,
            address = :address,
            locality_id = :locality_id,
            latitude = :latitude,
            longitude = :longitude,
            contact_name = :contact_name,
            phone = :phone,
            telegram = :telegram,
            email = :email,
            website = :website,
            booking_type = :booking_type,
            booking_url = :booking_url,
            status = 'pending',
            moderated_at = NULL,
            updated_at = NOW()
        WHERE id = :id
        AND user_id = :user_id
        AND status != 'expired'
        LIMIT 1
    ");

    $updateStmt->execute([
        'title' => $title,
        'short_description' => $shortDescription !== '' ? $shortDescription : null,
        'full_description' => $fullDescription !== '' ? $fullDescription : null,
        'address' => $address !== '' ? $address : null,
        'locality_id' => $localityId,
        'latitude' => $normalizedLatitude,
        'longitude' => $normalizedLongitude,
        'contact_name' => $contactName !== '' ? $contactName : null,
        'phone' => $phone !== '' ? $phone : null,
        'telegram' => $telegram !== '' ? $telegram : null,
        'email' => $email !== '' ? $email : null,
        'website' => $website !== '' ? $website : null,
        'booking_type' => $bookingType !== '' ? $bookingType : null,
        'booking_url' => $bookingUrl !== '' ? $bookingUrl : null,
        'id' => $placeId,
        'user_id' => $userId,
    ]);

    successResponse([
        'message' => 'Объект успешно обновлён и отправлен на модерацию',
        'place_id' => $placeId,
        'locality_id' => $localityId,
        'status' => 'pending',
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось обновить объект', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Документ структурирован из `php-after-changes/api-my-places-updated.md`. |