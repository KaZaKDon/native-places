# api/admin/plans/create.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Plans |
| Тип | PHP endpoint |
| Авторизация | Требуется admin session |
| Middleware | `requireAdmin()` |
| Источник | Код с хоста `api/admin/plans/create.php` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Создаёт новый тариф.

Endpoint:

1. принимает данные тарифа;
2. проверяет обязательные поля `code` и `title`;
3. проверяет уникальность `code`;
4. создаёт запись в таблице `plans`;
5. возвращает ID созданного тарифа.

## Метод и URL

```http
POST /api/admin/plans/create.php
```

## Авторизация

Требуется административная сессия.

Проверка выполняется через:

```php
requireAdmin();
```

Важно: endpoint доступен именно администратору.

## Request

### Body

```json
{
  "code": "pro",
  "title": "Pro",
  "description": "Профессиональный тариф",
  "max_places": 10,
  "duration_days": 30,
  "price": 990,
  "is_active": true
}
```

### Поля

| Поле | Тип | Обязательное | Описание |
|---|---:|---:|---|
| `code` | string | да | Код тарифа |
| `title` | string | да | Название тарифа |
| `description` | string | нет | Описание тарифа |
| `max_places` | number | нет | Лимит объявлений. По умолчанию `0` |
| `duration_days` | number | нет | Срок действия тарифа в днях. По умолчанию `14` |
| `price` | number | нет | Цена тарифа. По умолчанию `0` |
| `is_active` | boolean/number | нет | Активность тарифа |

## Success response

Код ответа: `201`.

```json
{
  "success": true,
  "message": "Тариф создан",
  "plan_id": 3
}
```

## Error responses

### 422 — не указан код тарифа

```json
{
  "success": false,
  "message": "Введите код тарифа"
}
```

### 422 — не указано название тарифа

```json
{
  "success": false,
  "message": "Введите название тарифа"
}
```

### 422 — тариф с таким кодом уже существует

```json
{
  "success": false,
  "message": "Тариф с таким кодом уже существует"
}
```

### 401 / 403 — нет доступа

Формируется в `requireAdmin()`.

Точный формат зависит от реализации `api/admin/shared/require-admin.php`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось создать тариф",
  "error": "..."
}
```

## Frontend notes

- Используется для создания тарифа в админке.
- Минимальная обязательная форма:
  - `code`;
  - `title`.
- `description` можно не передавать или передать пустой строкой — backend сохранит `NULL`.
- Если `duration_days` не передан, backend использует `14`.
- Если `max_places` не передан, backend использует `0`.
- Если `price` не передан, backend использует `0`.
- `is_active` приводится к `1`, если значение truthy, иначе `0`.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdmin()`.
- Подключение к базе фактически приходит через `require-admin.php`.
- Создаёт запись в таблице `plans`.
- Проверяет уникальность `code`.
- В текущей версии нет строгой валидации формата `code`, длины, цены и срока — это есть в `update.php`, но не в `create.php`.
- Endpoint не использует транзакцию.
- Endpoint не пишет moderator-log.

## PHP-код

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdmin();

$input = json_decode(file_get_contents('php://input'), true);

$code = trim($input['code'] ?? '');
$title = trim($input['title'] ?? '');
$description = trim($input['description'] ?? '');
$maxPlaces = (int) ($input['max_places'] ?? 0);
$durationDays = (int) ($input['duration_days'] ?? 14);
$price = (float) ($input['price'] ?? 0);
$isActive = !empty($input['is_active']) ? 1 : 0;

if ($code === '') {
    errorResponse('Введите код тарифа', 422);
}

if ($title === '') {
    errorResponse('Введите название тарифа', 422);
}

try {
    $pdo = getDatabaseConnection();

    $existsStmt = $pdo->prepare("
        SELECT id
        FROM plans
        WHERE code = :code
        LIMIT 1
    ");

    $existsStmt->execute([
        'code' => $code,
    ]);

    if ($existsStmt->fetch()) {
        errorResponse('Тариф с таким кодом уже существует', 422);
    }

    $stmt = $pdo->prepare("
        INSERT INTO plans (
            code,
            title,
            description,
            max_places,
            duration_days,
            price,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            :code,
            :title,
            :description,
            :max_places,
            :duration_days,
            :price,
            :is_active,
            NOW(),
            NOW()
        )
    ");

    $stmt->execute([
        'code' => $code,
        'title' => $title,
        'description' => $description !== '' ? $description : null,
        'max_places' => $maxPlaces,
        'duration_days' => $durationDays,
        'price' => $price,
        'is_active' => $isActive,
    ]);

    successResponse([
        'message' => 'Тариф создан',
        'plan_id' => (int) $pdo->lastInsertId(),
    ], 201);
} catch (Throwable $e) {
    errorResponse('Не удалось создать тариф', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-05 | Файл оформлен по коду с хоста и перенесён в структуру `docs/backend/admin/plans`. |