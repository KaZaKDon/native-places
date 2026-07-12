# api/admin/mailings/options.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Mailings |
| Тип | PHP endpoint |
| Авторизация | Требуется admin session |
| Middleware | `requireAdmin()` |
| Источник | Код с хоста `api/admin/mailings/options.php` |
| Готовность | Актуализировано по коду с хоста |

## Назначение

Возвращает данные для формы создания рассылки:

- типы аудитории;
- активные категории;
- активные тарифы;
- роли.

## Метод и URL

```http
GET /api/admin/mailings/options.php
```

## Авторизация

```php
requireAdmin();
```

Endpoint доступен только администратору.

## Success response

```json
{
  "success": true,
  "audience_types": [
    {
      "value": "all",
      "title": "Все пользователи",
      "requires_value": false
    },
    {
      "value": "moderators",
      "title": "Модераторы",
      "requires_value": false
    },
    {
      "value": "category",
      "title": "По категории объявлений",
      "requires_value": true
    },
    {
      "value": "plan",
      "title": "По тарифу",
      "requires_value": true
    },
    {
      "value": "role",
      "title": "По роли",
      "requires_value": true
    }
  ],
  "categories": [],
  "plans": [],
  "roles": []
}
```

## Audience types

| Значение | Название | Требует значение |
|---|---|---:|
| `all` | Все пользователи | нет |
| `moderators` | Модераторы | нет |
| `category` | По категории объявлений | да |
| `plan` | По тарифу | да |
| `role` | По роли | да |

## Error responses

### 401 / 403 — нет доступа

Формируется в `requireAdmin()`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось получить данные для рассылок",
  "error": "..."
}
```

## Frontend notes

- Используется для заполнения формы создания рассылки.
- Если `requires_value = true`, нужно показать дополнительный селект.
- Для `category` использовать `categories`.
- Для `plan` использовать `plans`.
- Для `role` использовать `roles`.

## Backend notes

- Использует `requireAdmin()`.
- Категории берутся только активные.
- Тарифы берутся только активные.
- Роли берутся все.

## PHP-код

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdmin();

try {
    $pdo = getDatabaseConnection();

    $categoriesStmt = $pdo->query("
        SELECT
            code,
            title
        FROM categories
        WHERE is_active = 1
        ORDER BY sort_order ASC, id ASC
    ");

    $plansStmt = $pdo->query("
        SELECT
            code,
            title
        FROM plans
        WHERE is_active = 1
        ORDER BY id ASC
    ");

    $rolesStmt = $pdo->query("
        SELECT
            code,
            title
        FROM roles
        ORDER BY id ASC
    ");

    successResponse([
        'audience_types' => [
            [
                'value' => 'all',
                'title' => 'Все пользователи',
                'requires_value' => false,
            ],
            [
                'value' => 'moderators',
                'title' => 'Модераторы',
                'requires_value' => false,
            ],
            [
                'value' => 'category',
                'title' => 'По категории объявлений',
                'requires_value' => true,
            ],
            [
                'value' => 'plan',
                'title' => 'По тарифу',
                'requires_value' => true,
            ],
            [
                'value' => 'role',
                'title' => 'По роли',
                'requires_value' => true,
            ],
        ],
        'categories' => $categoriesStmt->fetchAll(),
        'plans' => $plansStmt->fetchAll(),
        'roles' => $rolesStmt->fetchAll(),
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить данные для рассылок', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-05 | Файл актуализирован по коду с хоста. |