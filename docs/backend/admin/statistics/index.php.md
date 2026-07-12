# api/admin/statistics/index.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Statistics |
| Тип | PHP endpoint |
| Авторизация | Требуется admin/moderator session |
| Middleware | `requireAdminOrModerator()` |
| Источник | Код с хоста `api/admin/statistics/index.php` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Возвращает сводную статистику для административной панели.

Endpoint собирает данные по нескольким разделам:

- пользователи;
- объявления;
- жалобы;
- отзывы;
- обращения;
- платежи;
- подписки;
- категории;
- тарифы;
- последние события модерации.

## Метод и URL

```http
GET /api/admin/statistics/index.php
```

## Авторизация

Требуется административная или модераторская сессия.

Проверка выполняется через:

```php
requireAdminOrModerator();
```

Endpoint доступен администратору и модератору.

## Request

Тело запроса не требуется.

Query-параметров в текущей реализации нет.

## Success response

```json
{
  "success": true,
  "summary": [
    {
      "id": "users",
      "title": "Пользователи",
      "value": 120,
      "caption": "Активных: 100"
    },
    {
      "id": "places",
      "title": "Объявления",
      "value": 50,
      "caption": "Опубликовано: 35"
    },
    {
      "id": "pending_places",
      "title": "На модерации",
      "value": 8,
      "caption": "Ожидают проверки"
    },
    {
      "id": "subscriptions",
      "title": "Подписки",
      "value": 20,
      "caption": "Бессрочных: 3"
    },
    {
      "id": "reports",
      "title": "Жалобы",
      "value": 6,
      "caption": "Новых: 2"
    },
    {
      "id": "payments",
      "title": "Платежи",
      "value": 15,
      "caption": "Оплачено: 10"
    }
  ],
  "categories": [
    {
      "id": 1,
      "title": "Еда",
      "count": 12
    }
  ],
  "tariffs": [
    {
      "id": 1,
      "title": "Basic",
      "count": 7
    }
  ],
  "payments": [
    {
      "id": 1,
      "period": "Сегодня",
      "amount": "1 500 ₽"
    },
    {
      "id": 2,
      "period": "7 дней",
      "amount": "15 000 ₽"
    },
    {
      "id": 3,
      "period": "30 дней",
      "amount": "45 000 ₽"
    }
  ],
  "events": [
    {
      "id": 10,
      "time": "2026-07-05 12:00:00",
      "title": "Опубликовано объявление",
      "section": "place"
    }
  ],
  "extra": {
    "reviews_total": 30,
    "reviews_pending": 4,
    "appeals_total": 10,
    "appeals_new": 2
  }
}
```

## Структура ответа

### `summary[]`

Основные карточки статистики для dashboard.

| Поле | Тип | Описание |
|---|---:|---|
| `id` | string | Код карточки |
| `title` | string | Название карточки |
| `value` | number | Основное значение |
| `caption` | string | Дополнительная подпись |

В текущем коде возвращаются карточки:

| `id` | Название | Значение | Подпись |
|---|---|---|---|
| `users` | Пользователи | Всего пользователей | Активных |
| `places` | Объявления | Всего объявлений | Опубликовано |
| `pending_places` | На модерации | Объявления `pending` | Ожидают проверки |
| `subscriptions` | Подписки | Активные подписки | Бессрочные |
| `reports` | Жалобы | Всего жалоб | Новые |
| `payments` | Платежи | Всего платежей | Оплачено |

### `categories[]`

Статистика объявлений по категориям.

| Поле | Тип | Описание |
|---|---:|---|
| `id` | number | ID категории |
| `title` | string | Название категории |
| `count` | number | Количество объявлений в категории |

Сортировка:

```sql
ORDER BY c.sort_order ASC, c.id ASC
```

### `tariffs[]`

Статистика активных подписок по тарифам.

| Поле | Тип | Описание |
|---|---:|---|
| `id` | number | ID тарифа |
| `title` | string | Название тарифа |
| `count` | number | Количество активных подписок на тарифе |

Сортировка:

```sql
ORDER BY pl.price ASC, pl.id ASC
```

### `payments[]`

Сумма оплаченных платежей по периодам.

| `id` | Период | Условие |
|---:|---|---|
| `1` | Сегодня | `DATE(created_at) = CURDATE()` |
| `2` | 7 дней | `created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)` |
| `3` | 30 дней | `created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)` |

Сумма считается только по платежам:

```sql
WHERE status = 'paid'
```

Формат суммы:

```txt
1 500 ₽
```

### `events[]`

Последние события из таблицы `moderator_logs`.

| Поле | Тип | Описание |
|---|---:|---|
| `id` | number | ID лога |
| `time` | string | Дата события |
| `title` | string | Описание события |
| `section` | string | Тип сущности |

Сортировка:

```sql
ORDER BY created_at DESC, id DESC
LIMIT 10
```

### `extra`

Дополнительная статистика, которая не входит в основные карточки `summary`.

| Поле | Тип | Описание |
|---|---:|---|
| `reviews_total` | number | Всего отзывов |
| `reviews_pending` | number | Отзывы на модерации |
| `appeals_total` | number | Всего обращений |
| `appeals_new` | number | Новые обращения |

## Error responses

### 401 / 403 — нет доступа

Формируется в `requireAdminOrModerator()`.

Точный формат зависит от реализации `api/admin/shared/require-admin.php`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось получить статистику",
  "error": "..."
}
```

## Frontend notes

- Используется для dashboard/статистики в админке.
- `summary` удобно отображать как карточки.
- `categories` можно использовать для графика по категориям.
- `tariffs` можно использовать для графика подписок по тарифам.
- `payments` уже возвращает суммы в строковом формате с `₽`.
- `events` можно показывать как последние действия модераторов.
- `extra` можно использовать для дополнительных виджетов.
- В текущей реализации нет фильтра по периоду.
- Все данные считаются на момент запроса.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdminOrModerator()`.
- Подключение к базе фактически приходит через `require-admin.php`.
- Endpoint выполняет много отдельных SQL-запросов.
- Для сумм платежей используется helper-функция `formatPaymentAmount()`.
- `formatPaymentAmount()` принимает SQL-условие строкой и подставляет его в запрос.
- Условия для `formatPaymentAmount()` в текущем коде зашиты внутри backend-а и не приходят от пользователя, поэтому прямого пользовательского SQL-input здесь нет.
- Последние события берутся из `moderator_logs`.
- Endpoint не пишет moderator-log, потому что только читает статистику.

## PHP-код

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdminOrModerator();

try {
    $pdo = getDatabaseConnection();

    $usersTotal = (int) $pdo->query("SELECT COUNT(*) AS total FROM users")->fetch()['total'];
    $usersActive = (int) $pdo->query("SELECT COUNT(*) AS total FROM users WHERE status = 'active'")->fetch()['total'];

    $placesTotal = (int) $pdo->query("SELECT COUNT(*) AS total FROM places")->fetch()['total'];
    $placesPublished = (int) $pdo->query("SELECT COUNT(*) AS total FROM places WHERE status = 'published'")->fetch()['total'];
    $placesPending = (int) $pdo->query("SELECT COUNT(*) AS total FROM places WHERE status = 'pending'")->fetch()['total'];

    $reportsTotal = (int) $pdo->query("SELECT COUNT(*) AS total FROM reports")->fetch()['total'];
    $reportsNew = (int) $pdo->query("SELECT COUNT(*) AS total FROM reports WHERE status = 'new'")->fetch()['total'];

    $reviewsTotal = (int) $pdo->query("SELECT COUNT(*) AS total FROM reviews")->fetch()['total'];
    $reviewsPending = (int) $pdo->query("SELECT COUNT(*) AS total FROM reviews WHERE status = 'pending'")->fetch()['total'];
    
    $appealsTotal = (int) $pdo->query("SELECT COUNT(*) AS total FROM appeals")->fetch()['total'];
    $appealsNew = (int) $pdo->query("SELECT COUNT(*) AS total FROM appeals WHERE status = 'new'")->fetch()['total'];

    $paymentsTotal = (int) $pdo->query("SELECT COUNT(*) AS total FROM payments")->fetch()['total'];
    $paymentsPaid = (int) $pdo->query("SELECT COUNT(*) AS total FROM payments WHERE status = 'paid'")->fetch()['total'];

    $subscriptionsActive = (int) $pdo->query("
        SELECT COUNT(*) AS total
        FROM user_subscriptions
        WHERE status = 'active'
    ")->fetch()['total'];

    $subscriptionsForever = (int) $pdo->query("
        SELECT COUNT(*) AS total
        FROM user_subscriptions
        WHERE status = 'active'
        AND expires_at IS NULL
    ")->fetch()['total'];

    $categoryStmt = $pdo->query("
        SELECT
            c.id,
            c.title,
            COUNT(p.id) AS count
        FROM categories c
        LEFT JOIN places p
            ON p.category_id = c.id
        GROUP BY c.id
        ORDER BY c.sort_order ASC, c.id ASC
    ");

    $tariffStmt = $pdo->query("
        SELECT
            pl.id,
            pl.title,
            COUNT(us.id) AS count
        FROM plans pl
        LEFT JOIN user_subscriptions us
            ON us.plan_id = pl.id
            AND us.status = 'active'
        GROUP BY pl.id
        ORDER BY pl.price ASC, pl.id ASC
    ");

    $paymentStats = [
        [
            'id' => 1,
            'period' => 'Сегодня',
            'amount' => formatPaymentAmount($pdo, "DATE(created_at) = CURDATE()"),
        ],
        [
            'id' => 2,
            'period' => '7 дней',
            'amount' => formatPaymentAmount($pdo, "created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)"),
        ],
        [
            'id' => 3,
            'period' => '30 дней',
            'amount' => formatPaymentAmount($pdo, "created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)"),
        ],
    ];

    $eventsStmt = $pdo->query("
        SELECT
            id,
            created_at AS time,
            description AS title,
            entity_type AS section
        FROM moderator_logs
        ORDER BY created_at DESC, id DESC
        LIMIT 10
    ");

    successResponse([
        'summary' => [
            [
                'id' => 'users',
                'title' => 'Пользователи',
                'value' => $usersTotal,
                'caption' => 'Активных: ' . $usersActive,
            ],
            [
                'id' => 'places',
                'title' => 'Объявления',
                'value' => $placesTotal,
                'caption' => 'Опубликовано: ' . $placesPublished,
            ],
            [
                'id' => 'pending_places',
                'title' => 'На модерации',
                'value' => $placesPending,
                'caption' => 'Ожидают проверки',
            ],
            [
                'id' => 'subscriptions',
                'title' => 'Подписки',
                'value' => $subscriptionsActive,
                'caption' => 'Бессрочных: ' . $subscriptionsForever,
            ],
            [
                'id' => 'reports',
                'title' => 'Жалобы',
                'value' => $reportsTotal,
                'caption' => 'Новых: ' . $reportsNew,
            ],
            [
                'id' => 'payments',
                'title' => 'Платежи',
                'value' => $paymentsTotal,
                'caption' => 'Оплачено: ' . $paymentsPaid,
            ],
        ],
        'categories' => $categoryStmt->fetchAll(),
        'tariffs' => $tariffStmt->fetchAll(),
        'payments' => $paymentStats,
        'events' => $eventsStmt->fetchAll(),
        'extra' => [
            'reviews_total' => $reviewsTotal,
            'reviews_pending' => $reviewsPending,
            'appeals_total' => $appealsTotal,
            'appeals_new' => $appealsNew,
        ],
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить статистику', 500, [
        'error' => $e->getMessage(),
    ]);
}

function formatPaymentAmount(PDO $pdo, string $where): string
{
    $stmt = $pdo->query("
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM payments
        WHERE status = 'paid'
        AND {$where}
    ");

    $total = (float) $stmt->fetch()['total'];

    return number_format($total, 0, '.', ' ') . ' ₽';
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-05 | Файл оформлен по коду с хоста и перенесён в структуру `docs/backend/admin/statistics`. |