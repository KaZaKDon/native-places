# api/admin/settings/update.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Settings |
| Тип | PHP endpoint |
| Авторизация | Требуется admin session |
| Middleware | `requireAdmin()` |
| Источник | Код с хоста `api/admin/settings/update.php` |
| Готовность | Актуализировано по коду с хоста |

## Назначение

Обновляет настройки сайта.

Endpoint принимает объект `settings`, где ключ — это `setting_key` из таблицы `site_settings`, а значение — новое значение настройки.

Backend обновляет только те ключи, которые реально существуют в таблице `site_settings`.

Неизвестные ключи игнорируются.

## Метод и URL

```http
POST /api/admin/settings/update.php
```

## Авторизация

Требуется административная сессия.

```php
requireAdmin();
```

Endpoint доступен только администратору.

## Request

```json
{
  "settings": {
    "site_name": "Native Places",
    "moderation_enabled": true,
    "contacts_email": "info@example.com"
  }
}
```

## Поля

| Поле | Тип | Обязательное | Описание |
|---|---:|---:|---|
| `settings` | object | да | Объект настроек для обновления |

## Нормализация значений

Endpoint получает `field_type` для каждого известного ключа.

| `field_type` | Как сохраняется |
|---|---|
| `boolean` | `'1'` или `'0'` |
| любой другой | `trim((string) $value)` |

## Success response

```json
{
  "success": true,
  "message": "Настройки успешно обновлены",
  "updated_keys": [
    "site_name",
    "moderation_enabled"
  ]
}
```

## Error responses

### 400 — settings не является массивом/объектом

```json
{
  "success": false,
  "message": "Передайте массив настроек"
}
```

### 401 / 403 — нет доступа

Формируется в `requireAdmin()`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось обновить настройки сайта",
  "error": "..."
}
```

## Frontend notes

- Можно отправлять только изменённые настройки.
- Можно отправлять полный объект настроек.
- Backend обновит только существующие ключи.
- Неизвестные ключи не вызовут ошибку, но не попадут в `updated_keys`.
- После успешного сохранения можно показать `message`.

## Backend notes

- Использует `requireAdmin()`.
- Доступные настройки читаются из `site_settings`.
- Обновление идёт по `setting_key`.
- Валидация значений минимальная.
- Транзакция не используется.
- Endpoint не пишет moderator-log.

## PHP-код

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdmin();

$input = json_decode(
    file_get_contents('php://input'),
    true
);

$settings = $input['settings'] ?? null;

if (!is_array($settings)) {
    errorResponse('Передайте массив настроек', 400);
}

try {
    $pdo = getDatabaseConnection();

    $availableStmt = $pdo->query("
        SELECT
            setting_key,
            field_type
        FROM site_settings
    ");

    $availableSettings = [];

    foreach ($availableStmt->fetchAll() as $setting) {
        $availableSettings[$setting['setting_key']] = $setting['field_type'];
    }

    $updateStmt = $pdo->prepare("
        UPDATE site_settings
        SET
            setting_value = :setting_value,
            updated_at = NOW()
        WHERE setting_key = :setting_key
        LIMIT 1
    ");

    $updatedKeys = [];

    foreach ($settings as $key => $value) {
        if (!isset($availableSettings[$key])) {
            continue;
        }

        $fieldType = $availableSettings[$key];

        if ($fieldType === 'boolean') {
            $normalizedValue = $value ? '1' : '0';
        } else {
            $normalizedValue = trim((string) $value);
        }

        $updateStmt->execute([
            'setting_key' => $key,
            'setting_value' => $normalizedValue,
        ]);

        $updatedKeys[] = $key;
    }

    successResponse([
        'message' => 'Настройки успешно обновлены',
        'updated_keys' => $updatedKeys,
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось обновить настройки сайта', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-05 | Файл актуализирован по коду с хоста. |