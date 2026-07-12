# api/admin/mailings/index.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Mailings |
| Тип | PHP endpoint |
| Авторизация | Требуется admin session |
| Middleware | `requireAdmin()` |
| Источник | Код с хоста `api/admin/mailings/index.php` |
| Готовность | Актуализировано по коду с хоста |

## Назначение

Возвращает список рассылок для административной панели.

## Метод и URL

```http
GET /api/admin/mailings/index.php
```

## Авторизация

Требуется административная сессия.

```php
requireAdmin();
```

Endpoint доступен только администратору.

## Success response

```json
{
  "success": true,
  "mailings": [
    {
      "id": 1,
      "subject": "Новость Native Places",
      "audience_type": "all",
      "audience_value": null,
      "status": "draft",
      "recipients_count": 100,
      "sent_count": 0,
      "failed_count": 0,
      "created_by_name": "Администратор",
      "error_message": null,
      "created_at": "2026-07-05 12:00:00",
      "sent_at": null
    }
  ]
}
```

## Структура `mailings[]`

| Поле | Тип | Описание |
|---|---:|---|
| `id` | number | ID рассылки |
| `subject` | string | Тема |
| `audience_type` | string | Тип аудитории |
| `audience_value` | string/null | Значение аудитории |
| `status` | string | Статус |
| `recipients_count` | number | Получателей всего |
| `sent_count` | number | Отправлено |
| `failed_count` | number | Ошибок |
| `created_by_name` | string/null | Кто создал |
| `error_message` | string/null | Ошибка |
| `created_at` | string | Дата создания |
| `sent_at` | string/null | Дата отправки |

## Error responses

### 401 / 403 — нет доступа

Формируется в `requireAdmin()`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось получить список рассылок",
  "error": "..."
}
```

## Frontend notes

- Используется для списка рассылок.
- Список отсортирован от новых к старым.
- Модератору раздел недоступен.

## Backend notes

- Использует `requireAdmin()`.
- Данные берутся из `mailings`.
- Тело рассылки `body` в списке не возвращается.
- Endpoint не использует пагинацию.

## PHP-код

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdmin();

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->query("
        SELECT
            id,
            subject,
            audience_type,
            audience_value,
            status,
            recipients_count,
            sent_count,
            failed_count,
            created_by_name,
            error_message,
            created_at,
            sent_at
        FROM mailings
        ORDER BY created_at DESC, id DESC
    ");

    successResponse([
        'mailings' => $stmt->fetchAll(),
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить список рассылок', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-05 | Файл актуализирован по коду с хоста. |