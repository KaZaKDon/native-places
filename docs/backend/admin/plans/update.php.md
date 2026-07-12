# api/admin/plans/update.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Plans |
| Тип | PHP endpoint |
| Авторизация | Требуется admin session |
| Middleware | `requireAdmin()` |
| Логирование | `writeModeratorLog()` |
| Источник | Код с хоста `api/admin/plans/update.php` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Обновляет тариф.

Endpoint:

1. принимает ID тарифа;
2. валидирует код, название, лимиты, срок и цену;
3. проверяет существование тарифа;
4. проверяет уникальность `code`;
5. обновляет запись в таблице `plans`;
6. пишет действие в лог модерации;
7. возвращает ID обновлённого тарифа.

## Метод и URL

```http
POST /api/admin/plans/update.php
```

## Авторизация

Требуется административная сессия.

Проверка выполняется через:

```php
$adminUser = requireAdmin();
```

Важно: endpoint доступен именно администратору.

## Request

### Body

```json
{
  "id": 1,
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
| `id` | number | да | ID тарифа |
| `code` | string | да | Код тарифа |
| `title` | string | да | Название тарифа |
| `description` | string | нет | Описание тарифа |
| `max_places` | number | нет | Лимит объявлений |
| `duration_days` | number | нет | Срок действия в днях |
| `price` | number/string | нет | Цена |
| `is_active` | mixed | нет | Активность тарифа |

## Нормализация

### `code`

Код приводится к нижнему регистру:

```php
$code = mb_strtolower($code, 'UTF-8');
```

### `price`

Цена округляется до двух знаков:

```php
$price = round($price, 2);
```

И сохраняется в формате:

```php
number_format($price, 2, '.', '')
```

### `is_active`

Активным считается значение из списка:

```php
[1, '1', true, 'true', 'on', 'yes']
```

В остальных случаях сохраняется `0`.

## Валидация

| Поле | Условие | Ошибка |
|---|---|---|
| `id` | Не передан или меньше/равен нулю | `Не передан ID тарифа` |
| `code` | Пустой | `Введите код тарифа` |
| `code` | Не соответствует `^[a-z0-9_-]+$` | `Код тарифа может содержать только латинские буквы, цифры, дефис и подчёркивание` |
| `code` | Длиннее 100 символов | `Код тарифа не должен быть длиннее 100 символов` |
| `title` | Пустой | `Введите название тарифа` |
| `title` | Длиннее 255 символов | `Название тарифа не должно быть длиннее 255 символов` |
| `max_places` | Меньше 0 | `Лимит объявлений не может быть отрицательным` |
| `duration_days` | Меньше или равен 0 | `Срок тарифа должен быть больше 0 дней` |
| `price` | Не число или меньше 0 | `Цена тарифа не может быть отрицательной` |
| `code` | Уже используется другим тарифом | `Тариф с таким кодом уже существует` |

## Success response

```json
{
  "success": true,
  "message": "Тариф обновлён",
  "plan_id": 1
}
```

## Error responses

### 400 — не передан ID тарифа

```json
{
  "success": false,
  "message": "Не передан ID тарифа"
}
```

### 404 — тариф не найден

```json
{
  "success": false,
  "message": "Тариф не найден"
}
```

### 422 — ошибки валидации

Примеры:

```json
{
  "success": false,
  "message": "Введите код тарифа"
}
```

```json
{
  "success": false,
  "message": "Код тарифа может содержать только латинские буквы, цифры, дефис и подчёркивание"
}
```

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
  "message": "Не удалось обновить тариф",
  "error": "..."
}
```

## Frontend notes

- Используется для редактирования тарифа в админке.
- В отличие от `create.php`, здесь валидация намного строже.
- `code` должен содержать только:
  - латинские буквы;
  - цифры;
  - дефис;
  - подчёркивание.
- `duration_days` должен быть больше 0.
- `max_places` не может быть отрицательным.
- `price` не может быть отрицательной.
- После успешного обновления нужно обновить список тарифов через `index.php`.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdmin()`.
- Использует `moderator-log.php`.
- Работает внутри транзакции.
- При ошибке транзакция откатывается.
- Проверяет существование тарифа.
- Проверяет уникальность `code` среди других тарифов.
- Обрабатывает duplicate key `PDOException` с кодом `1062`.
- Логирует действие `update_plan` для сущности `plan`.

## PHP-код

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';
require_once __DIR__ . '/../shared/moderator-log.php';

$adminUser = requireAdmin();

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    $input = [];
}

$id = (int) ($input['id'] ?? 0);
$code = trim((string) ($input['code'] ?? ''));
$title = trim((string) ($input['title'] ?? ''));
$description = trim((string) ($input['description'] ?? ''));

$maxPlaces = (int) ($input['max_places'] ?? 0);
$durationDays = (int) ($input['duration_days'] ?? 14);

$priceRaw = $input['price'] ?? 0;
$price = is_numeric($priceRaw) ? (float) $priceRaw : -1;

$isActiveRaw = $input['is_active'] ?? 0;
$isActive = in_array($isActiveRaw, [1, '1', true, 'true', 'on', 'yes'], true) ? 1 : 0;

$code = mb_strtolower($code, 'UTF-8');

if ($id <= 0) {
    errorResponse('Не передан ID тарифа', 400);
}

if ($code === '') {
    errorResponse('Введите код тарифа', 422);
}

if (!preg_match('/^[a-z0-9_-]+$/', $code)) {
    errorResponse('Код тарифа может содержать только латинские буквы, цифры, дефис и подчёркивание', 422);
}

if (mb_strlen($code, 'UTF-8') > 100) {
    errorResponse('Код тарифа не должен быть длиннее 100 символов', 422);
}

if ($title === '') {
    errorResponse('Введите название тарифа', 422);
}

if (mb_strlen($title, 'UTF-8') > 255) {
    errorResponse('Название тарифа не должно быть длиннее 255 символов', 422);
}

if ($maxPlaces < 0) {
    errorResponse('Лимит объявлений не может быть отрицательным', 422);
}

if ($durationDays <= 0) {
    errorResponse('Срок тарифа должен быть больше 0 дней', 422);
}

if ($price < 0) {
    errorResponse('Цена тарифа не может быть отрицательной', 422);
}

$price = round($price, 2);

try {
    $pdo = getDatabaseConnection();

    $pdo->beginTransaction();

    $planStmt = $pdo->prepare("
        SELECT
            id,
            code,
            title,
            description,
            max_places,
            duration_days,
            price,
            is_active
        FROM plans
        WHERE id = :id
        LIMIT 1
    ");

    $planStmt->execute([
        'id' => $id,
    ]);

    $plan = $planStmt->fetch();

    if (!$plan) {
        $pdo->rollBack();
        errorResponse('Тариф не найден', 404);
    }

    $existsStmt = $pdo->prepare("
        SELECT id
        FROM plans
        WHERE code = :code
        AND id <> :id
        LIMIT 1
    ");

    $existsStmt->execute([
        'id' => $id,
        'code' => $code,
    ]);

    if ($existsStmt->fetch()) {
        $pdo->rollBack();
        errorResponse('Тариф с таким кодом уже существует', 422);
    }

    $stmt = $pdo->prepare("
        UPDATE plans
        SET
            code = :code,
            title = :title,
            description = :description,
            max_places = :max_places,
            duration_days = :duration_days,
            price = :price,
            is_active = :is_active,
            updated_at = NOW()
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $id,
        'code' => $code,
        'title' => $title,
        'description' => $description !== '' ? $description : null,
        'max_places' => $maxPlaces,
        'duration_days' => $durationDays,
        'price' => number_format($price, 2, '.', ''),
        'is_active' => $isActive,
    ]);

    writeModeratorLog(
        (int) $adminUser['id'],
        'update_plan',
        'plan',
        $id,
        'Обновлён тариф: ' . $title . ' (' . $code . ')',
        $pdo
    );

    $pdo->commit();

    successResponse([
        'message' => 'Тариф обновлён',
        'plan_id' => $id,
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    if ($e instanceof PDOException && ($e->errorInfo[1] ?? null) === 1062) {
        errorResponse('Тариф с таким кодом уже существует', 422);
    }

    errorResponse('Не удалось обновить тариф', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-05 | Файл оформлен по коду с хоста и перенесён в структуру `docs/backend/admin/plans`. |