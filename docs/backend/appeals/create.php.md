# api/appeals/create.php

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

Endpoint создаёт обращение текущего авторизованного пользователя.

Поддерживаемые типы обращения:

```text
support
idea
```

Новое обращение создаётся со статусом:

```text
new
```

## Метод и URL

```http
POST /api/appeals/create.php
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
  "type": "support",
  "contact": "user@example.com",
  "message": "Текст обращения"
}
```

## Request fields

| Поле | Тип | Обязательное | Правила |
|---|---|---:|---|
| `type` | string | да | Только `support` или `idea`. |
| `contact` | string | нет | Контакт для ответа. Если пустой, сохраняется `null`. |
| `message` | string | да | Не пустой текст обращения. |

## Success response

HTTP `201`

```json
{
  "success": true,
  "data": {
    "message": "Обращение отправлено",
    "appeal_id": 1
  }
}
```

## Error responses

| HTTP | `message` | Причина |
|---:|---|---|
| `401` | зависит от `requireAuth()` | Пользователь не авторизован. |
| `422` | `Некорректный тип обращения` | `type` не `support` и не `idea`. |
| `422` | `Введите текст обращения` | `message` пустой. |
| `500` | `Не удалось отправить обращение` | Неожиданная ошибка backend-а или базы данных. |

## Frontend notes

- Endpoint использовать для формы обращения в поддержку или отправки идеи.
- На фронте лучше сделать выбор типа:
  - `support`;
  - `idea`.
- После успешной отправки показать сообщение «Обращение отправлено».
- После успеха можно очистить форму или перейти к списку обращений.
- Если `contact` пустой, backend сохранит `null`.

## Backend notes

- Используется таблица `appeals`.
- Допустимые типы:
  - `support`;
  - `idea`.
- Новое обращение создаётся со статусом:
  - `new`.
- `admin_response` при создании всегда `NULL`.
- `contact` сохраняется как `null`, если пустой.

## PHP-код

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(file_get_contents('php://input'), true);

$type = trim($input['type'] ?? '');
$contact = trim($input['contact'] ?? '');
$message = trim($input['message'] ?? '');

$allowedTypes = ['support', 'idea'];

if (!in_array($type, $allowedTypes, true)) {
    errorResponse('Некорректный тип обращения', 422);
}

if ($message === '') {
    errorResponse('Введите текст обращения', 422);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        INSERT INTO appeals (
            user_id,
            appeal_type,
            contact,
            message,
            admin_response,
            status,
            created_at,
            updated_at
        ) VALUES (
            :user_id,
            :appeal_type,
            :contact,
            :message,
            NULL,
            'new',
            NOW(),
            NOW()
        )
    ");

    $stmt->execute([
        'user_id' => $userId,
        'appeal_type' => $type,
        'contact' => $contact !== '' ? $contact : null,
        'message' => $message,
    ]);

    successResponse([
        'message' => 'Обращение отправлено',
        'appeal_id' => (int) $pdo->lastInsertId(),
    ], 201);
} catch (Throwable $e) {
    errorResponse('Не удалось отправить обращение', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Документ структурирован из `docs/API_FULL_TEXT.md`. |