# api/admin/settings/index.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Settings |
| Тип | PHP endpoint |
| Авторизация | Требуется admin session |
| Middleware | `requireAdmin()` |
| Источник | Код с хоста `api/admin/settings/index.php` |
| Готовность | Актуализировано по коду с хоста |

## Назначение

Возвращает настройки сайта для административной панели.

Endpoint получает все записи из таблицы `site_settings`, а затем формирует два представления:

- `groups` — настройки, сгруппированные по `setting_group`;
- `settings` — исходный плоский список настроек из базы.

## Метод и URL

```http
GET /api/admin/settings/index.php
```

## Авторизация

Требуется административная сессия.

Проверка выполняется через:

```php
requireAdmin();
```

Endpoint доступен только администратору.

## Request

Тело запроса не требуется.

Query-параметров в текущей реализации нет.

## Success response

```json
{
  "success": true,
  "groups": [
    {
      "code": "general",
      "title": "Общие настройки",
      "items": [
        {
          "id": 1,
          "key": "site_name",
          "value": "Native Places",
          "group": "general",
          "field_type": "text",
          "title": "Название сайта",
          "sort_order": 10,
          "updated_at": "2026-07-05 12:00:00"
        }
      ]
    }
  ],
  "settings": [
    {
      "id": 1,
      "setting_key": "site_name",
      "setting_value": "Native Places",
      "setting_group": "general",
      "field_type": "text",
      "title": "Название сайта",
      "sort_order": 10,
      "updated_at": "2026-07-05 12:00:00"
    }
  ]
}
```

## Структура `groups[]`

| Поле | Тип | Описание |
|---|---:|---|
| `code` | string | Код группы |
| `title` | string | Название группы |
| `items` | array | Настройки внутри группы |

## Структура `groups[].items[]`

| Поле | Тип | Описание |
|---|---:|---|
| `id` | number | ID настройки |
| `key` | string | Ключ настройки |
| `value` | string/null | Значение |
| `group` | string | Код группы |
| `field_type` | string | Тип поля |
| `title` | string | Название настройки |
| `sort_order` | number | Порядок сортировки |
| `updated_at` | string/null | Дата обновления |

## Группы настроек

Функция `getSettingsGroupTitle()` знает такие группы:

| Код | Название |
|---|---|
| `general` | Общие настройки |
| `places` | Объявления |
| `moderation` | Модерация |
| `payments` | Платежи |
| `contacts` | Контакты |

Если код группы неизвестен, возвращается сам код.

## Error responses

### 401 / 403 — нет доступа

Формируется в `requireAdmin()`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось получить настройки сайта",
  "error": "..."
}
```

## Frontend notes

- Используется для страницы настроек сайта.
- Для интерфейса удобнее использовать `groups`.
- `settings` можно использовать как плоский список.
- Тип поля определяется через `field_type`.
- Сортировка уже выполнена backend-ом:
  - `setting_group ASC`;
  - `sort_order ASC`;
  - `id ASC`.

## Backend notes

- Использует `requireAdmin()`.
- Данные берутся из `site_settings`.
- Endpoint не фильтрует настройки.
- Endpoint не скрывает значения.
- Функция `getSettingsGroupTitle()` локальная и находится в этом же файле.

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
            setting_key,
            setting_value,
            setting_group,
            field_type,
            title,
            sort_order,
            updated_at
        FROM site_settings
        ORDER BY setting_group ASC, sort_order ASC, id ASC
    ");

    $settings = $stmt->fetchAll();

    $groups = [];

    foreach ($settings as $setting) {
        $groupCode = $setting['setting_group'];

        if (!isset($groups[$groupCode])) {
            $groups[$groupCode] = [
                'code' => $groupCode,
                'title' => getSettingsGroupTitle($groupCode),
                'items' => [],
            ];
        }

        $groups[$groupCode]['items'][] = [
            'id' => (int) $setting['id'],
            'key' => $setting['setting_key'],
            'value' => $setting['setting_value'],
            'group' => $setting['setting_group'],
            'field_type' => $setting['field_type'],
            'title' => $setting['title'],
            'sort_order' => (int) $setting['sort_order'],
            'updated_at' => $setting['updated_at'],
        ];
    }

    successResponse([
        'groups' => array_values($groups),
        'settings' => $settings,
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить настройки сайта', 500, [
        'error' => $e->getMessage(),
    ]);
}

function getSettingsGroupTitle(string $groupCode): string
{
    $titles = [
        'general' => 'Общие настройки',
        'places' => 'Объявления',
        'moderation' => 'Модерация',
        'payments' => 'Платежи',
        'contacts' => 'Контакты',
    ];

    return $titles[$groupCode] ?? $groupCode;
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-05 | Файл актуализирован по коду с хоста. |