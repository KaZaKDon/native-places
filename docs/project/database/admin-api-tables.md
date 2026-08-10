# Admin API SQL tables

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Database |
| Тип | SQL-документация |
| PHP endpoint | Нет |
| Источник | `admin/docs/native_places_admin_api_files.md` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Документ фиксирует SQL-таблицы, добавленные под административный API Native Places.

В этот блок входят таблицы:

- `site_settings`;
- `admin_access_codes`;
- `mailings`;
- `mailing_recipients`.

Эти таблицы используются endpoint-ами:

- `api/admin/settings/index.php`;
- `api/admin/settings/update.php`;
- `api/admin/auth/login-code.php`;
- `api/admin/mailings/options.php`;
- `api/admin/mailings/preview.php`;
- `api/admin/mailings/index.php`;
- `api/admin/mailings/send.php`;
- `api/admin/mailings/delete.php`.

---

## site_settings

### Назначение

Хранит настройки сайта, которые редактируются из админки.

Используется в:

- `api/admin/settings/index.php`;
- `api/admin/settings/update.php`.

### SQL

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

### Поля

| Поле | Тип | Описание |
|---|---|---|
| `id` | `INT AUTO_INCREMENT` | ID настройки |
| `setting_key` | `VARCHAR(100)` | Уникальный ключ настройки |
| `setting_value` | `TEXT NULL` | Значение настройки |
| `setting_group` | `VARCHAR(50)` | Группа настроек |
| `field_type` | `ENUM` | Тип поля в админке |
| `title` | `VARCHAR(255)` | Человекочитаемое название |
| `sort_order` | `INT` | Порядок сортировки |
| `updated_at` | `DATETIME` | Дата обновления |

### Возможные `field_type`

| Значение | Назначение |
|---|---|
| `text` | Обычное текстовое поле |
| `number` | Числовое поле |
| `boolean` | Переключатель true/false |
| `textarea` | Многострочный текст |

### Backend notes

- В `settings/update.php` значение типа `boolean` сохраняется как строка `1` или `0`.
- Остальные значения сохраняются как `trim((string) $value)`.
- `setting_key` уникален.
- Группировка в UI строится по `setting_group`.

---

## admin_access_codes

### Назначение

Хранит коды доступа для входа в админку по коду.

Используется в:

- `api/admin/auth/login-code.php`.

Также в дальнейшем эта таблица связана с новой архитектурой модераторов.

### SQL

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

### Поля

| Поле | Тип | Описание |
|---|---|---|
| `id` | `INT AUTO_INCREMENT` | ID кода доступа |
| `role_code` | `ENUM('moderator')` | Роль, которую получает вошедший по коду |
| `display_name` | `VARCHAR(255)` | Имя, отображаемое в админке |
| `code_hash` | `VARCHAR(255)` | Хеш кода доступа |
| `status` | `ENUM('active', 'disabled')` | Статус кода |
| `expires_at` | `DATETIME NULL` | Дата окончания действия |
| `last_login_at` | `DATETIME NULL` | Последний вход по коду |
| `created_at` | `DATETIME` | Дата создания |

### Backend notes

- Код доступа не хранится открытым текстом.
- Проверка выполняется через `password_verify($code, $item['code_hash'])`.
- В `login-code.php` выбираются только записи со `status = 'active'`.
- Если `expires_at` заполнен и дата в прошлом, вход запрещается.
- После успешного входа обновляется `last_login_at`.

---

## mailings

### Назначение

Хранит рассылки, созданные из админки.

Используется в:

- `api/admin/mailings/index.php`;
- `api/admin/mailings/send.php`;
- `api/admin/mailings/delete.php`.

### SQL

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

### Поля

| Поле | Тип | Описание |
|---|---|---|
| `id` | `INT AUTO_INCREMENT` | ID рассылки |
| `subject` | `VARCHAR(255)` | Тема рассылки |
| `body` | `TEXT` | Текст рассылки |
| `audience_type` | `ENUM` | Тип аудитории |
| `audience_value` | `VARCHAR(100) NULL` | Значение аудитории |
| `status` | `ENUM` | Статус рассылки |
| `recipients_count` | `INT` | Всего получателей |
| `sent_count` | `INT` | Успешно отправлено |
| `failed_count` | `INT` | Ошибок отправки |
| `created_by_name` | `VARCHAR(255) NULL` | Кто создал рассылку |
| `error_message` | `TEXT NULL` | Ошибка рассылки |
| `created_at` | `DATETIME` | Дата создания |
| `sent_at` | `DATETIME NULL` | Дата отправки |

### Возможные `audience_type`

| Значение | Описание |
|---|---|
| `all` | Все активные пользователи с email |
| `moderators` | Пользователи с ролью модератора |
| `category` | Пользователи по категории объявлений |
| `plan` | Пользователи по тарифу |
| `role` | Пользователи по роли |

### Возможные `status`

| Значение | Описание |
|---|---|
| `draft` | Черновик |
| `sending` | В процессе отправки |
| `sent` | Отправлена |
| `failed` | Ошибка отправки |

### Backend notes

- В текущем `send.php` рассылка создаётся как `draft`.
- Фактической отправки писем в показанном коде нет.
- Удалять через `delete.php` можно только рассылки со статусом `draft`.

---

## mailing_recipients

### Назначение

Хранит получателей конкретной рассылки.

Используется в:

- `api/admin/mailings/send.php`.

При создании рассылки endpoint добавляет сюда всех рассчитанных получателей со статусом `pending`.

### SQL

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

### Поля

| Поле | Тип | Описание |
|---|---|---|
| `id` | `INT AUTO_INCREMENT` | ID записи получателя |
| `mailing_id` | `INT` | ID рассылки |
| `user_id` | `INT NULL` | ID пользователя |
| `email` | `VARCHAR(255)` | Email получателя |
| `status` | `ENUM` | Статус отправки конкретному получателю |
| `error_message` | `TEXT NULL` | Ошибка отправки |
| `sent_at` | `DATETIME NULL` | Дата отправки |
| `created_at` | `DATETIME` | Дата создания |

### Возможные `status`

| Значение | Описание |
|---|---|
| `pending` | Ожидает отправки |
| `sent` | Отправлено |
| `failed` | Ошибка отправки |

### Связи

```sql
CONSTRAINT fk_mailing_recipients_mailing
    FOREIGN KEY (mailing_id)
    REFERENCES mailings(id)
    ON DELETE CASCADE
```

Это значит:

- получатели привязаны к рассылке;
- при удалении рассылки должны удаляться связанные получатели.

## Общие замечания

- Все таблицы используют `ENGINE=InnoDB`.
- Все таблицы используют `CHARSET=utf8mb4`.
- Для `mailing_recipients` есть каскадное удаление по `mailing_id`.
- Для `site_settings` уникальность обеспечивается через `setting_key`.
- Для `admin_access_codes` в исходном SQL нет связи с `users`, но ниже в документации есть дополнение про новую архитектуру модераторов.

---

# Дополнение: новая архитектура модераторов

## Статус

| Поле | Значение |
|---|---|
| Тип | Дополнение к SQL |
| Источник | `admin/docs/native_places_admin_api_files.md` |
| Дата в исходном документе | Июнь 2026 |

## Смысл изменения

В новой архитектуре:

```txt
модератор = зарегистрированный пользователь
```

То есть модератор больше не должен быть только абстрактным кодом доступа. Он должен быть связан с записью в таблице `users`.

## Изменение таблицы admin_access_codes

Добавлено поле:

```sql
ALTER TABLE admin_access_codes
ADD COLUMN user_id BIGINT UNSIGNED NULL;
```

Добавлен индекс:

```sql
ALTER TABLE admin_access_codes
ADD INDEX idx_admin_access_codes_user (user_id);
```

## Новая схема

```txt
users
└── role = moderator

admin_access_codes
└── user_id
└── code_hash
└── status
```

## Логика

Один пользователь:

```txt
1 модератор = 1 активный код
```

При генерации нового кода:

```txt
старый код отключается
новый становится активным
```

## Связанные API

В исходной документации указаны новые endpoint-ы:

```txt
api/admin/users/make-moderator.php
api/admin/users/generate-moderator-code.php
```

Функции:

- назначение роли `moderator`;
- создание нового кода доступа;
- привязка к `user_id`;
- отключение старых кодов.

## Важное замечание

В текущем архиве полного PHP-кода для этих endpoint-ов нет.

Есть только описание, что они были добавлены:

```txt
api/admin/users/make-moderator.php
api/admin/users/generate-moderator-code.php
```

Поэтому для них нельзя честно собрать полный `.php.md` с PHP-кодом, пока не будет исходного PHP-кода с хоста или из другого файла.

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | SQL-таблицы admin API перенесены в новую структуру документации `docs/backend/admin/database`. |