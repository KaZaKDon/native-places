
# api/admin/users/update-subscription.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Users |
| Тип | PHP endpoint |
| Авторизация | Требуется admin session |
| Middleware | `requireAdmin()` |
| Логирование | `writeModeratorLog()` |
| Источник | Код с хоста `api/admin/users/update-subscription.php` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Управляет подпиской пользователя из админки.

Endpoint поддерживает действия:

- назначить подписку;
- продлить подписку;
- выдать бессрочную подписку;
- отключить активную подписку.

## Метод и URL

```http
POST /api/admin/users/update-subscription.php
```

## Авторизация

Требуется административная сессия.

Проверка выполняется через:

```php
$adminUser = requireAdmin();
```

Endpoint доступен именно администратору.

## Request

### Body

```json
{
  "user_id": 15,
  "plan_id": 2,
  "action": "assign"
}
```

### Поля

| Поле | Тип | Обязательное | Описание |
|---|---:|---:|---|
| `user_id` | number | да | ID пользователя |
| `plan_id` | number | зависит от действия | ID тарифа |
| `action` | string | нет | Действие с подпиской. По умолчанию `assign` |

## Allowed actions

```php
$allowedActions = ['assign', 'extend', 'forever', 'disable'];
```

| Действие | Нужен `plan_id` | Назначение |
|---|---:|---|
| `assign` | да | Назначить новый тариф |
| `extend` | да | Продлить активную подписку |
| `forever` | да | Выдать бессрочную подписку |
| `disable` | нет | Отключить активную подписку |

## Логика действий

### `assign`

Назначает пользователю новый активный тариф.

Перед созданием новой подписки все старые активные подписки пользователя переводятся в `cancelled`.

### `extend`

Продлевает подписку на срок тарифа.

Если текущая подписка ещё не истекла, срок считается от текущей даты окончания. Если уже истекла — от текущей даты.

Нельзя продлевать бессрочную подписку.

### `forever`

Создаёт бессрочную подписку:

```txt
expires_at = null
```

### `disable`

Отключает все активные подписки пользователя:

```txt
status = cancelled
```

`plan_id` для этого действия не нужен.

## Success response

### Назначение / продление / бессрочная подписка

```json
{
  "success": true,
  "message": "Назначена подписка: Pro",
  "user_id": 15,
  "subscription_id": 7,
  "expires_at": "2026-08-03 12:00:00"
}
```

### Бессрочная подписка

```json
{
  "success": true,
  "message": "Выдана бессрочная подписка: Pro",
  "user_id": 15,
  "subscription_id": 7,
  "expires_at": null
}
```

### Отключение подписки

```json
{
  "success": true,
  "message": "Подписка отключена",
  "user_id": 15
}
```

## Error responses

### 422 — не передан ID пользователя

```json
{
  "success": false,
  "message": "Не передан ID пользователя"
}
```

### 422 — некорректное действие

```json
{
  "success": false,
  "message": "Некорректное действие с подпиской"
}
```

### 422 — не выбран тариф

```json
{
  "success": false,
  "message": "Выберите тариф"
}
```

### 404 — пользователь не найден

```json
{
  "success": false,
  "message": "Пользователь не найден"
}
```

### 403 — пользователь заблокирован или удалён

```json
{
  "success": false,
  "message": "Нельзя управлять подпиской заблокированного или удалённого пользователя"
}
```

### 422 — нет активной подписки для отключения

```json
{
  "success": false,
  "message": "У пользователя нет активной подписки"
}
```

### 404 — тариф не найден

```json
{
  "success": false,
  "message": "Тариф не найден"
}
```

### 422 — тариф отключён

```json
{
  "success": false,
  "message": "Нельзя назначить отключённый тариф"
}
```

### 422 — некорректный срок тарифа

```json
{
  "success": false,
  "message": "У тарифа некорректный срок действия"
}
```

### 422 — нет активной подписки для продления

```json
{
  "success": false,
  "message": "У пользователя нет активной подписки для продления"
}
```

### 422 — бессрочную подписку продлевать не нужно

```json
{
  "success": false,
  "message": "Бессрочную подписку продлевать не нужно"
}
```

### 401 / 403 — нет доступа

Формируется в `requireAdmin()`.

Точный формат зависит от реализации `api/admin/shared/require-admin.php`.

### 500 — ошибка сервера

```json
{
  "success": false,
  "message": "Не удалось обновить подписку пользователя",
  "error": "..."
}
```

## Frontend notes

- Используется в карточке пользователя для управления подпиской.
- Для `disable` не нужно отправлять `plan_id`.
- Для `assign`, `extend`, `forever` нужно отправлять `plan_id`.
- Если `expires_at = null`, это бессрочная подписка.
- После успешного ответа нужно обновить карточку пользователя через `show.php`.
- Для действия `extend` лучше заранее проверять, есть ли активная подписка.
- Если активная подписка бессрочная, кнопку продления лучше скрыть.

## Backend notes

- Использует общую CORS-обвязку.
- Использует `requireAdmin()`.
- Использует `moderator-log.php`.
- Работает внутри транзакции.
- При ошибке транзакция откатывается.
- Пользователь должен быть активным.
- Тариф должен существовать и быть активным.
- Для всех действий, кроме `disable`, старая активная подписка отменяется и создаётся новая.
- Новые подписки создаются с:
  ```txt
  source = admin
  status = active
  ```
- Для бессрочной подписки `expires_at = null`.
- Действия логируются через `writeModeratorLog()`.

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

$userId = (int) ($input['user_id'] ?? 0);
$planId = (int) ($input['plan_id'] ?? 0);
$action = trim($input['action'] ?? 'assign');

$allowedActions = ['assign', 'extend', 'forever', 'disable'];

if ($userId <= 0) {
    errorResponse('Не передан ID пользователя', 422);
}

if (!in_array($action, $allowedActions, true)) {
    errorResponse('Некорректное действие с подпиской', 422);
}

if ($action !== 'disable' && $planId <= 0) {
    errorResponse('Выберите тариф', 422);
}

try {
    $pdo = getDatabaseConnection();

    $pdo->beginTransaction();

    $userStmt = $pdo->prepare("
        SELECT
            id,
            email,
            first_name,
            last_name,
            status
        FROM users
        WHERE id = :id
        LIMIT 1
    ");

    $userStmt->execute([
        'id' => $userId,
    ]);

    $user = $userStmt->fetch();

    if (!$user) {
        $pdo->rollBack();
        errorResponse('Пользователь не найден', 404);
    }

    if (($user['status'] ?? '') !== 'active') {
        $pdo->rollBack();
        errorResponse('Нельзя управлять подпиской заблокированного или удалённого пользователя', 403);
    }

    $currentSubscriptionStmt = $pdo->prepare("
        SELECT
            id,
            user_id,
            plan_id,
            source,
            status,
            starts_at,
            expires_at,
            created_at,
            updated_at
        FROM user_subscriptions
        WHERE user_id = :user_id
        AND status = 'active'
        ORDER BY id DESC
        LIMIT 1
    ");

    $currentSubscriptionStmt->execute([
        'user_id' => $userId,
    ]);

    $currentSubscription = $currentSubscriptionStmt->fetch();

    if ($action === 'disable') {
        if (!$currentSubscription) {
            $pdo->rollBack();
            errorResponse('У пользователя нет активной подписки', 422);
        }

        $disableStmt = $pdo->prepare("
            UPDATE user_subscriptions
            SET
                starts_at = starts_at,
                status = 'cancelled',
                updated_at = NOW()
            WHERE user_id = :user_id
            AND status = 'active'
        ");

        $disableStmt->execute([
            'user_id' => $userId,
        ]);

        writeModeratorLog(
            (int) $adminUser['id'],
            'disable_subscription',
            'user',
            $userId,
            'Отключена подписка пользователя: ' . ($user['email'] ?? ('#' . $userId))
        );

        $pdo->commit();

        successResponse([
            'message' => 'Подписка отключена',
            'user_id' => $userId,
        ]);
    }

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
        'id' => $planId,
    ]);

    $plan = $planStmt->fetch();

    if (!$plan) {
        $pdo->rollBack();
        errorResponse('Тариф не найден', 404);
    }

    if ((int) $plan['is_active'] !== 1) {
        $pdo->rollBack();
        errorResponse('Нельзя назначить отключённый тариф', 422);
    }

    $durationDays = (int) ($plan['duration_days'] ?? 0);

    if ($action !== 'forever' && $durationDays <= 0) {
        $pdo->rollBack();
        errorResponse('У тарифа некорректный срок действия', 422);
    }

    if ($action === 'extend' && !$currentSubscription) {
        $pdo->rollBack();
        errorResponse('У пользователя нет активной подписки для продления', 422);
    }

    if (
        $action === 'extend'
        && $currentSubscription
        && empty($currentSubscription['expires_at'])
    ) {
        $pdo->rollBack();
        errorResponse('Бессрочную подписку продлевать не нужно', 422);
    }

    $startsAt = (new DateTimeImmutable())->format('Y-m-d H:i:s');
    $expiresAt = null;

    if ($action === 'forever') {
        $expiresAt = null;
    } elseif ($action === 'extend') {
        $baseDate = new DateTimeImmutable();

        if (!empty($currentSubscription['expires_at'])) {
            $currentExpiresAt = new DateTimeImmutable($currentSubscription['expires_at']);

            if ($currentExpiresAt > $baseDate) {
                $baseDate = $currentExpiresAt;
            }
        }

        $expiresAt = $baseDate
            ->modify('+' . $durationDays . ' days')
            ->format('Y-m-d H:i:s');
    } else {
        $expiresAt = (new DateTimeImmutable())
            ->modify('+' . $durationDays . ' days')
            ->format('Y-m-d H:i:s');
    }

    $cancelStmt = $pdo->prepare("
        UPDATE user_subscriptions
        SET
            starts_at = starts_at,
            status = 'cancelled',
            updated_at = NOW()
        WHERE user_id = :user_id
        AND status = 'active'
    ");

    $cancelStmt->execute([
        'user_id' => $userId,
    ]);

    $insertStmt = $pdo->prepare("
        INSERT INTO user_subscriptions (
            user_id,
            plan_id,
            source,
            status,
            starts_at,
            expires_at,
            created_at,
            updated_at
        ) VALUES (
            :user_id,
            :plan_id,
            'admin',
            'active',
            :starts_at,
            :expires_at,
            NOW(),
            NOW()
        )
    ");

    $insertStmt->execute([
        'user_id' => $userId,
        'plan_id' => (int) $plan['id'],
        'starts_at' => $startsAt,
        'expires_at' => $expiresAt,
    ]);

    $subscriptionId = (int) $pdo->lastInsertId();

    $description = match ($action) {
        'forever' => 'Выдана бессрочная подписка: ' . $plan['title'],
        'extend' => 'Продлена подписка: ' . $plan['title'],
        default => 'Назначена подписка: ' . $plan['title'],
    };

    $logAction = match ($action) {
        'forever' => 'set_forever_subscription',
        'extend' => 'extend_subscription',
        default => 'update_subscription',
    };

    writeModeratorLog(
        (int) $adminUser['id'],
        $logAction,
        'user',
        $userId,
        $description . ' пользователю ' . ($user['email'] ?? ('#' . $userId))
    );

    $pdo->commit();

    successResponse([
        'message' => $description,
        'user_id' => $userId,
        'subscription_id' => $subscriptionId,
        'expires_at' => $expiresAt,
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось обновить подписку пользователя', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Файл оформлен по коду с хоста и перенесён в структуру `docs/backend/admin/users`. |