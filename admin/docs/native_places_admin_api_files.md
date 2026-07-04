# Native Places Admin API

Собрано по текущему состоянию работ над папкой `api/admin`.

## Структура

```txt
api/
└── admin/
    ├── shared/
    │   └── require-admin.php
    │
    ├── auth/
    │   ├── login-admin.php
    │   ├── login-code.php
    │   ├── me.php
    │   └── logout.php
    │
    ├── settings/
    │   ├── index.php
    │   └── update.php
    │
    └── mailings/
        ├── options.php
        ├── preview.php
        ├── index.php
        ├── send.php
        └── delete.php
```

---

## `api/admin/shared/require-admin.php`

```php
<?php

require_once __DIR__ . '/../../shared/response.php';
require_once __DIR__ . '/../../config/database.php';

function getCurrentAdminUser(): ?array
{
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    if (empty($_SESSION['admin_user']) || !is_array($_SESSION['admin_user'])) {
        return null;
    }

    return $_SESSION['admin_user'];
}

function requireAdmin(): array
{
    $adminUser = getCurrentAdminUser();

    if (!$adminUser) {
        errorResponse('Требуется авторизация администратора', 401);
    }

    if (($adminUser['role_code'] ?? '') !== 'admin') {
        errorResponse('Недостаточно прав администратора', 403);
    }

    return $adminUser;
}

function requireAdminOrModerator(): array
{
    $adminUser = getCurrentAdminUser();

    if (!$adminUser) {
        errorResponse('Требуется авторизация администратора или модератора', 401);
    }

    $roleCode = $adminUser['role_code'] ?? '';

    if (!in_array($roleCode, ['admin', 'moderator'], true)) {
        errorResponse('Недостаточно прав', 403);
    }

    return $adminUser;
}
```

---

## `api/admin/auth/login-admin.php`

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../../shared/response.php';
require_once __DIR__ . '/../../config/database.php';

session_start();

$input = json_decode(file_get_contents('php://input'), true);

$email = trim($input['email'] ?? '');
$password = trim($input['password'] ?? '');

$errors = [];

if ($email === '') {
    $errors['email'] = 'Введите email';
} elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'Некорректный email';
}

if ($password === '') {
    $errors['password'] = 'Введите пароль';
}

if (!empty($errors)) {
    errorResponse('Ошибка валидации', 422, [
        'errors' => $errors,
    ]);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            u.id,
            u.role_id,
            u.email,
            u.password_hash,
            u.first_name,
            u.last_name,
            u.status,
            r.code AS role_code,
            r.title AS role_title
        FROM users u
        INNER JOIN roles r
            ON r.id = u.role_id
        WHERE u.email = :email
        LIMIT 1
    ");

    $stmt->execute([
        'email' => $email,
    ]);

    $user = $stmt->fetch();

    if (!$user) {
        errorResponse('Неверный email или пароль', 401);
    }

    if ($user['status'] !== 'active') {
        errorResponse('Пользователь заблокирован или удалён', 403);
    }

    if (!password_verify($password, $user['password_hash'])) {
        errorResponse('Неверный email или пароль', 401);
    }

    if ($user['role_code'] !== 'admin') {
        errorResponse('Недостаточно прав для входа в админку', 403);
    }

    unset($user['password_hash']);

    $_SESSION['admin_user'] = [
        'id' => (int) $user['id'],
        'email' => $user['email'],
        'name' => trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? '')),
        'role_code' => 'admin',
        'role_title' => $user['role_title'],
        'access_type' => 'account',
    ];

    successResponse([
        'message' => 'Вход в админку выполнен',
        'authenticated' => true,
        'user' => $_SESSION['admin_user'],
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось выполнить вход в админку', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

---

## `api/admin/auth/login-code.php`

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../../shared/response.php';
require_once __DIR__ . '/../../config/database.php';

session_start();

$input = json_decode(file_get_contents('php://input'), true);

$code = trim($input['code'] ?? '');

if ($code === '') {
    errorResponse('Введите код доступа', 422);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            id,
            role_code,
            display_name,
            code_hash,
            status,
            expires_at
        FROM admin_access_codes
        WHERE status = 'active'
        ORDER BY id ASC
    ");

    $stmt->execute();
    $accessItems = $stmt->fetchAll();
    $matchedAccess = null;

    foreach ($accessItems as $item) {
        if (password_verify($code, $item['code_hash'])) {
            $matchedAccess = $item;
            break;
        }
    }

    if (!$matchedAccess) {
        errorResponse('Неверный код доступа', 401);
    }

    if (!empty($matchedAccess['expires_at'])) {
        $expiresAt = strtotime($matchedAccess['expires_at']);

        if ($expiresAt !== false && $expiresAt < time()) {
            errorResponse('Срок действия кода истёк', 403);
        }
    }

    $updateStmt = $pdo->prepare("
        UPDATE admin_access_codes
        SET last_login_at = NOW()
        WHERE id = :id
        LIMIT 1
    ");

    $updateStmt->execute([
        'id' => (int) $matchedAccess['id'],
    ]);

    $_SESSION['admin_user'] = [
        'id' => (int) $matchedAccess['id'],
        'email' => null,
        'name' => $matchedAccess['display_name'],
        'role_code' => $matchedAccess['role_code'],
        'role_title' => 'Модератор',
        'access_type' => 'code',
    ];

    successResponse([
        'message' => 'Вход по коду выполнен',
        'authenticated' => true,
        'user' => $_SESSION['admin_user'],
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось выполнить вход по коду', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

---

## `api/admin/auth/me.php`

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../../shared/response.php';

session_start();

$adminUser = $_SESSION['admin_user'] ?? null;

if (!$adminUser) {
    successResponse([
        'authenticated' => false,
        'user' => null,
    ]);
}

successResponse([
    'authenticated' => true,
    'user' => $adminUser,
]);
```

---

## `api/admin/auth/logout.php`

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../../shared/response.php';

session_start();

unset($_SESSION['admin_user']);

successResponse([
    'message' => 'Выход из админки выполнен',
    'authenticated' => false,
    'user' => null,
]);
```

---

## `api/admin/settings/index.php`

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

---

## `api/admin/settings/update.php`

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdmin();

$input = json_decode(file_get_contents('php://input'), true);
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
        $normalizedValue = $fieldType === 'boolean' ? ($value ? '1' : '0') : trim((string) $value);

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

---

## `api/admin/mailings/options.php`

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdmin();

try {
    $pdo = getDatabaseConnection();

    $categoriesStmt = $pdo->query("
        SELECT code, title
        FROM categories
        WHERE is_active = 1
        ORDER BY sort_order ASC, id ASC
    ");

    $plansStmt = $pdo->query("
        SELECT code, title
        FROM plans
        WHERE is_active = 1
        ORDER BY id ASC
    ");

    $rolesStmt = $pdo->query("
        SELECT code, title
        FROM roles
        ORDER BY id ASC
    ");

    successResponse([
        'audience_types' => [
            ['value' => 'all', 'title' => 'Все пользователи', 'requires_value' => false],
            ['value' => 'moderators', 'title' => 'Модераторы', 'requires_value' => false],
            ['value' => 'category', 'title' => 'По категории объявлений', 'requires_value' => true],
            ['value' => 'plan', 'title' => 'По тарифу', 'requires_value' => true],
            ['value' => 'role', 'title' => 'По роли', 'requires_value' => true],
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

---

## `api/admin/mailings/preview.php`

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdmin();

$input = json_decode(file_get_contents('php://input'), true);

$audienceType = trim($input['audience_type'] ?? 'all');
$audienceValue = trim($input['audience_value'] ?? '');

try {
    $pdo = getDatabaseConnection();
    [$sql, $params] = buildRecipientsQuery($audienceType, $audienceValue);

    $stmt = $pdo->prepare("SELECT COUNT(*) AS total FROM ({$sql}) recipients");
    $stmt->execute($params);

    successResponse([
        'audience_type' => $audienceType,
        'audience_value' => $audienceValue,
        'recipients_count' => (int) $stmt->fetch()['total'],
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось рассчитать получателей', 500, [
        'error' => $e->getMessage(),
    ]);
}

function buildRecipientsQuery(string $audienceType, string $audienceValue): array
{
    $baseSelect = "SELECT DISTINCT u.id, u.email FROM users u";
    $baseWhere = "WHERE u.status = 'active' AND u.email IS NOT NULL AND u.email <> ''";

    if ($audienceType === 'all') {
        return [$baseSelect . ' ' . $baseWhere, []];
    }

    if ($audienceType === 'moderators') {
        return [$baseSelect . " INNER JOIN roles r ON r.id = u.role_id {$baseWhere} AND r.code = 'moderator'", []];
    }

    if ($audienceType === 'role') {
        if ($audienceValue === '') {
            errorResponse('Выберите роль', 422);
        }

        return [$baseSelect . " INNER JOIN roles r ON r.id = u.role_id {$baseWhere} AND r.code = :role_code", ['role_code' => $audienceValue]];
    }

    if ($audienceType === 'category') {
        if ($audienceValue === '') {
            errorResponse('Выберите категорию', 422);
        }

        return [$baseSelect . " INNER JOIN places p ON p.user_id = u.id INNER JOIN categories c ON c.id = p.category_id {$baseWhere} AND c.code = :category_code", ['category_code' => $audienceValue]];
    }

    if ($audienceType === 'plan') {
        if ($audienceValue === '') {
            errorResponse('Выберите тариф', 422);
        }

        return [$baseSelect . " INNER JOIN user_subscriptions us ON us.user_id = u.id INNER JOIN plans p ON p.id = us.plan_id {$baseWhere} AND p.code = :plan_code", ['plan_code' => $audienceValue]];
    }

    errorResponse('Неизвестный тип аудитории', 422);
}
```

---

## `api/admin/mailings/index.php`

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

---

## `api/admin/mailings/send.php`

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdmin();

$input = json_decode(file_get_contents('php://input'), true);

$subject = trim($input['subject'] ?? '');
$body = trim($input['body'] ?? '');
$audienceType = trim($input['audience_type'] ?? 'all');
$audienceValue = trim($input['audience_value'] ?? '');

if ($subject === '') {
    errorResponse('Введите тему рассылки', 422);
}

if ($body === '') {
    errorResponse('Введите текст рассылки', 422);
}

try {
    $pdo = getDatabaseConnection();
    [$recipientsSql, $recipientsParams] = buildRecipientsQuery($audienceType, $audienceValue);

    $recipientsStmt = $pdo->prepare($recipientsSql);
    $recipientsStmt->execute($recipientsParams);
    $recipients = $recipientsStmt->fetchAll();

    if (count($recipients) === 0) {
        errorResponse('Для выбранной аудитории нет получателей', 422);
    }

    $adminUser = getCurrentAdminUser();

    $pdo->beginTransaction();

    $mailingStmt = $pdo->prepare("
        INSERT INTO mailings (
            subject,
            body,
            audience_type,
            audience_value,
            status,
            recipients_count,
            sent_count,
            failed_count,
            created_by_name,
            created_at
        ) VALUES (
            :subject,
            :body,
            :audience_type,
            :audience_value,
            'draft',
            :recipients_count,
            0,
            0,
            :created_by_name,
            NOW()
        )
    ");

    $mailingStmt->execute([
        'subject' => $subject,
        'body' => $body,
        'audience_type' => $audienceType,
        'audience_value' => $audienceValue !== '' ? $audienceValue : null,
        'recipients_count' => count($recipients),
        'created_by_name' => $adminUser['name'] ?? 'Администратор',
    ]);

    $mailingId = (int) $pdo->lastInsertId();

    $recipientStmt = $pdo->prepare("
        INSERT INTO mailing_recipients (
            mailing_id,
            user_id,
            email,
            status,
            created_at
        ) VALUES (
            :mailing_id,
            :user_id,
            :email,
            'pending',
            NOW()
        )
    ");

    foreach ($recipients as $recipient) {
        $recipientStmt->execute([
            'mailing_id' => $mailingId,
            'user_id' => (int) $recipient['id'],
            'email' => $recipient['email'],
        ]);
    }

    $pdo->commit();

    successResponse([
        'message' => 'Рассылка создана как черновик',
        'mailing_id' => $mailingId,
        'recipients_count' => count($recipients),
        'status' => 'draft',
    ], 201);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось создать рассылку', 500, [
        'error' => $e->getMessage(),
    ]);
}

function buildRecipientsQuery(string $audienceType, string $audienceValue): array
{
    $baseSelect = "SELECT DISTINCT u.id, u.email FROM users u";
    $baseWhere = "WHERE u.status = 'active' AND u.email IS NOT NULL AND u.email <> ''";

    if ($audienceType === 'all') {
        return [$baseSelect . ' ' . $baseWhere, []];
    }

    if ($audienceType === 'moderators') {
        return [$baseSelect . " INNER JOIN roles r ON r.id = u.role_id {$baseWhere} AND r.code = 'moderator'", []];
    }

    if ($audienceType === 'role') {
        if ($audienceValue === '') {
            errorResponse('Выберите роль', 422);
        }

        return [$baseSelect . " INNER JOIN roles r ON r.id = u.role_id {$baseWhere} AND r.code = :role_code", ['role_code' => $audienceValue]];
    }

    if ($audienceType === 'category') {
        if ($audienceValue === '') {
            errorResponse('Выберите категорию', 422);
        }

        return [$baseSelect . " INNER JOIN places p ON p.user_id = u.id INNER JOIN categories c ON c.id = p.category_id {$baseWhere} AND c.code = :category_code", ['category_code' => $audienceValue]];
    }

    if ($audienceType === 'plan') {
        if ($audienceValue === '') {
            errorResponse('Выберите тариф', 422);
        }

        return [$baseSelect . " INNER JOIN user_subscriptions us ON us.user_id = u.id INNER JOIN plans p ON p.id = us.plan_id {$baseWhere} AND p.code = :plan_code", ['plan_code' => $audienceValue]];
    }

    errorResponse('Неизвестный тип аудитории', 422);
}
```

---

## `api/admin/mailings/delete.php`

```php
<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdmin();

$input = json_decode(file_get_contents('php://input'), true);
$mailingId = (int) ($input['mailing_id'] ?? 0);

if ($mailingId <= 0) {
    errorResponse('Не указан идентификатор рассылки', 422);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT id, status
        FROM mailings
        WHERE id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $mailingId,
    ]);

    $mailing = $stmt->fetch();

    if (!$mailing) {
        errorResponse('Рассылка не найдена', 404);
    }

    if ($mailing['status'] !== 'draft') {
        errorResponse('Удалять можно только черновики', 422);
    }

    $deleteStmt = $pdo->prepare("
        DELETE FROM mailings
        WHERE id = :id
        LIMIT 1
    ");

    $deleteStmt->execute([
        'id' => $mailingId,
    ]);

    successResponse([
        'message' => 'Черновик удалён',
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось удалить рассылку', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

---

## SQL-таблицы, добавленные под admin API

## `site_settings`

```sql
CREATE TABLE site_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NULL,
    setting_group VARCHAR(50) NOT NULL DEFAULT 'general',
    field_type ENUM('text', 'number', 'boolean', 'textarea') NOT NULL DEFAULT 'text',
    title VARCHAR(255) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## `admin_access_codes`

```sql
CREATE TABLE admin_access_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_code ENUM('moderator') NOT NULL DEFAULT 'moderator',
    display_name VARCHAR(255) NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    status ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
    expires_at DATETIME NULL,
    last_login_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## `mailings`

```sql
CREATE TABLE mailings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    audience_type ENUM('all', 'moderators', 'category', 'plan', 'role') NOT NULL DEFAULT 'all',
    audience_value VARCHAR(100) NULL,
    status ENUM('draft', 'sending', 'sent', 'failed') NOT NULL DEFAULT 'draft',
    recipients_count INT NOT NULL DEFAULT 0,
    sent_count INT NOT NULL DEFAULT 0,
    failed_count INT NOT NULL DEFAULT 0,
    created_by_name VARCHAR(255) NULL,
    error_message TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    sent_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## `mailing_recipients`

```sql
CREATE TABLE mailing_recipients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mailing_id INT NOT NULL,
    user_id INT NULL,
    email VARCHAR(255) NOT NULL,
    status ENUM('pending', 'sent', 'failed') NOT NULL DEFAULT 'pending',
    error_message TEXT NULL,
    sent_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mailing_recipients_mailing
        FOREIGN KEY (mailing_id)
        REFERENCES mailings(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## Дополнения к Native Places Admin API (июнь 2026)

## Реализовано после создания документа

### Пользователи

Добавлены:

```txt
api/admin/users/index.php
api/admin/users/show.php
```

Возможности:

* список пользователей;
* карточка пользователя;
* получение объявлений пользователя;
* получение текущей подписки;
* получение истории подписок.

Ответ `show.php`:

```json
{
  "user": {},
  "places": [],
  "subscription": {},
  "subscriptions": []
}
```

---

### Подписки пользователей

Добавлены:

```txt
api/admin/users/update-subscription.php
```

Поддерживаются действия:

* выдача нового тарифа;
* смена тарифа;
* отключение подписки;
* бессрочная подписка.

---

### Бессрочные подписки

Изменена структура:

```sql
ALTER TABLE user_subscriptions
MODIFY expires_at TIMESTAMP NULL DEFAULT NULL;
```

Логика:

```txt
expires_at = NULL
```

означает бессрочную подписку.

В карточке пользователя отображается:

```txt
Бессрочная подписка
```

---

### История подписок

В карточке пользователя реализован отдельный блок:

```txt
История подписок
```

Отображаются:

* тариф;
* дата начала;
* дата окончания;
* источник выдачи;
* статус.

---

### Статистика

Добавлен backend:

```txt
api/admin/statistics/index.php
```

Статистика переведена с демо-данных на реальные данные БД.

Разделы:

* пользователи;
* объявления;
* подписки;
* жалобы;
* платежи;
* категории;
* тарифы;
* последние события.

---

### Последние события

Источники:

```txt
places
user_subscriptions
```

Примеры событий:

```txt
Опубликовано объявление
Отклонено объявление
Назначена подписка
Продлена подписка
Выдана бессрочная подписка
```

---

### 404 страница сайта

Добавлено:

```txt
src/pages/NotFound/
```

Используется отдельный фон:

```txt
public/images/404.webp
```

Особенности:

* адаптив;
* отдельная мобильная версия;
* плавное появление карточки;
* стеклянный эффект.

---

### 404 страница админки

Добавлена отдельная страница:

```txt
src/pages/NotFound/
```

Особенности:

* без фонового изображения;
* рабочий стиль панели управления;
* кнопка "На главную";
* кнопка "Назад".

---

### Модераторы

Принята новая архитектура.

Ранее:

```txt
код доступа существовал отдельно
```

Теперь:

```txt
модератор = зарегистрированный пользователь
```

---

### Таблица admin_access_codes

Добавлено поле:

```sql
ALTER TABLE admin_access_codes
ADD COLUMN user_id BIGINT UNSIGNED NULL;
```

Также добавлен индекс:

```sql
ALTER TABLE admin_access_codes
ADD INDEX idx_admin_access_codes_user (user_id);
```

---

### Новая схема модераторов

```txt
users
└── role = moderator

admin_access_codes
└── user_id
└── code_hash
└── status
```

Один пользователь:

```txt
1 модератор = 1 активный код
```

При генерации нового кода:

```txt
старый код отключается
новый становится активным
```

---

### Новые API модераторов

Добавлены:

```txt
api/admin/users/make-moderator.php
api/admin/users/generate-moderator-code.php
```

Функции:

* назначение роли moderator;
* создание нового кода доступа;
* привязка к user_id;
* отключение старых кодов.

---

### UserManagementCard

Добавлен блок:

```txt
Модерация
```

Функции:

* сделать модератором;
* создать новый код доступа;
* отображение текущей роли.

---

### Что ещё осталось

Модераторы

Осталось:

* переделать login-code.php на user_id;
* отправка кода модератора на email;
* отключение роли модератора;
* перевыпуск кода через интерфейс.

#### Платежи

Осталось:

* реальные платежи;
* подтверждение оплаты;
* история платежей.

#### Логи модераторов

Осталось:

```txt
api/admin/moderator-logs/*
```

и интерфейс просмотра логов.

 Статистика

Осталось:

* фильтры по периоду;
* экспорт данных.
