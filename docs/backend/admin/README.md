# Admin Backend API

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin API |
| Корневая папка на хосте | `/api/admin/` |
| Документация | `docs/backend/admin/` |
| Статус сверки | Сверено по коду с хоста |
| Дата актуализации | 2026-07-05 |

## Назначение

Этот раздел описывает административный backend API проекта Native Places.

Admin API используется для:

- входа администратора и модератора;
- управления пользователями;
- модерации объявлений;
- управления жалобами;
- управления отзывами;
- обработки обращений пользователей;
- управления тарифами;
- просмотра платежей;
- управления категориями;
- управления типами объектов;
- управления характеристиками;
- управления справочниками;
- просмотра статистики;
- просмотра логов модерации;
- управления рассылками;
- управления кодами доступа.

## Общая структура

```txt
docs/backend/admin/
├── README.md
├── 00_STRUCTURE.md
├── access-codes/
├── appeals/
├── attributes/
├── auth/
├── categories/
├── dashboard/
├── database/
├── dictionaries/
├── mailings/
├── moderator-logs/
├── payments/
├── place-types/
├── places/
├── plans/
├── reports/
├── reviews/
├── settings/
├── shared/
├── statistics/
└── users/
```

## Авторизация

В admin API используются два основных guard-а:

```php
requireAdmin();
requireAdminOrModerator();
```

Они находятся в:

```txt
api/admin/shared/require-admin.php
```

Документация:

```txt
docs/backend/admin/shared/require-admin.php.md
```

## Роли доступа

### Только администратор

Endpoint-ы с:

```php
requireAdmin();
```

доступны только пользователю с:

```txt
role_code = admin
```

### Администратор или модератор

Endpoint-ы с:

```php
requireAdminOrModerator();
```

доступны пользователям с ролями:

```txt
admin
moderator
```

## Auth

Папка:

```txt
api/admin/auth/
```

Документация:

```txt
docs/backend/admin/auth/
```

| Endpoint | Метод | Доступ | Назначение |
|---|---|---|---|
| `login-admin.php` | `POST` | public | Вход администратора по email/password |
| `login-code.php` | `POST` | public | Вход модератора по коду доступа |
| `logout.php` | `POST` | session | Выход из админки |
| `me.php` | `GET` | session | Проверка текущей admin-сессии |

Файлы:

```txt
docs/backend/admin/auth/login-admin.php.md
docs/backend/admin/auth/login-code.php.md
docs/backend/admin/auth/logout.php.md
docs/backend/admin/auth/me.php.md
```

## Shared

Папка:

```txt
api/admin/shared/
```

Документация:

```txt
docs/backend/admin/shared/
```

| Файл | Тип | Назначение |
|---|---|---|
| `require-admin.php` | helper | Проверка admin/moderator сессии |
| `moderator-log.php` | helper | Запись действий в `moderator_logs` |

Файлы:

```txt
docs/backend/admin/shared/require-admin.php.md
docs/backend/admin/shared/moderator-log.php.md
```

## Users

Папка:

```txt
api/admin/users/
```

Документация:

```txt
docs/backend/admin/users/
```

| Endpoint | Метод | Доступ | Назначение |
|---|---|---|---|
| `index.php` | `GET` | admin/moderator | Список пользователей |
| `show.php` | `GET` | admin/moderator | Карточка пользователя |
| `update-role.php` | `POST` | admin | Изменение роли пользователя |
| `update-status.php` | `POST` | admin | Изменение статуса пользователя |
| `update-subscription.php` | `POST` | admin | Управление подпиской пользователя |
| `make-moderator.php` | `POST` | admin | Назначение пользователя модератором |
| `generate-moderator-code.php` | `POST` | admin | Генерация кода доступа модератора |

Файлы:

```txt
docs/backend/admin/users/index.php.md
docs/backend/admin/users/show.php.md
docs/backend/admin/users/update-role.php.md
docs/backend/admin/users/update-status.php.md
docs/backend/admin/users/update-subscription.php.md
docs/backend/admin/users/make-moderator.php.md
docs/backend/admin/users/generate-moderator-code.php.md
```

## Places

Папка:

```txt
api/admin/places/
```

Документация:

```txt
docs/backend/admin/places/
```

| Endpoint | Метод | Доступ | Назначение |
|---|---|---|---|
| `index.php` | `GET` | admin/moderator | Список объявлений |
| `show.php` | `GET` | admin/moderator | Карточка объявления |
| `publish.php` | `POST` | admin/moderator | Публикация объявления |
| `reject.php` | `POST` | admin/moderator | Отклонение объявления |
| `archive.php` | `POST` | admin/moderator | Архивирование объявления |

Файлы:

```txt
docs/backend/admin/places/index.php.md
docs/backend/admin/places/show.php.md
docs/backend/admin/places/publish.php.md
docs/backend/admin/places/reject.php.md
docs/backend/admin/places/archive.php.md
```

## Reports

Папка:

```txt
api/admin/reports/
```

Документация:

```txt
docs/backend/admin/reports/
```

| Endpoint | Метод | Доступ | Назначение |
|---|---|---|---|
| `index.php` | `GET` | admin/moderator | Список жалоб |
| `show.php` | `GET` | admin/moderator | Карточка жалобы |
| `close.php` | `POST` | admin/moderator | Закрытие жалобы |

Файлы:

```txt
docs/backend/admin/reports/index.php.md
docs/backend/admin/reports/show.php.md
docs/backend/admin/reports/close.php.md
```

## Reviews

Папка:

```txt
api/admin/reviews/
```

Документация:

```txt
docs/backend/admin/reviews/
```

| Endpoint | Метод | Доступ | Назначение |
|---|---|---|---|
| `index.php` | `GET` | admin/moderator | Список отзывов |
| `show.php` | `GET` | admin/moderator | Карточка отзыва |
| `publish.php` | `POST` | admin/moderator | Публикация отзыва |
| `reject.php` | `POST` | admin/moderator | Отклонение отзыва |

Файлы:

```txt
docs/backend/admin/reviews/index.php.md
docs/backend/admin/reviews/show.php.md
docs/backend/admin/reviews/publish.php.md
docs/backend/admin/reviews/reject.php.md
```

## Appeals

Папка:

```txt
api/admin/appeals/
```

Документация:

```txt
docs/backend/admin/appeals/
```

| Endpoint | Метод | Доступ | Назначение |
|---|---|---|---|
| `index.php` | `GET` | admin/moderator | Список обращений |
| `show.php` | `GET` | admin/moderator | Карточка обращения |
| `update.php` | `POST` | admin/moderator | Обновление статуса и ответа |

Файлы:

```txt
docs/backend/admin/appeals/index.php.md
docs/backend/admin/appeals/show.php.md
docs/backend/admin/appeals/update.php.md
```

## Payments

Папка:

```txt
api/admin/payments/
```

Документация:

```txt
docs/backend/admin/payments/
```

| Endpoint | Метод | Доступ | Назначение |
|---|---|---|---|
| `index.php` | `GET` | admin | Список платежей |
| `show.php` | `GET` | admin | Карточка платежа |

Файлы:

```txt
docs/backend/admin/payments/index.php.md
docs/backend/admin/payments/show.php.md
```

## Plans

Папка:

```txt
api/admin/plans/
```

Документация:

```txt
docs/backend/admin/plans/
```

| Endpoint | Метод | Доступ | Назначение |
|---|---|---|---|
| `index.php` | `GET` | admin | Список тарифов |
| `create.php` | `POST` | admin | Создание тарифа |
| `update.php` | `POST` | admin | Обновление тарифа |

Файлы:

```txt
docs/backend/admin/plans/index.php.md
docs/backend/admin/plans/create.php.md
docs/backend/admin/plans/update.php.md
```

## Access Codes

Папка:

```txt
api/admin/access-codes/
```

Документация:

```txt
docs/backend/admin/access-codes/
```

| Endpoint | Метод | Доступ | Назначение |
|---|---|---|---|
| `index.php` | `GET` | admin | Список кодов доступа |
| `create.php` | `POST` | admin | Создание кода доступа |
| `disable.php` | `POST` | admin | Отключение кода доступа |

Файлы:

```txt
docs/backend/admin/access-codes/index.php.md
docs/backend/admin/access-codes/create.php.md
docs/backend/admin/access-codes/disable.php.md
```

## Categories

Папка:

```txt
api/admin/categories/
```

Документация:

```txt
docs/backend/admin/categories/
```

| Endpoint | Метод | Доступ | Назначение |
|---|---|---|---|
| `index.php` | `GET` | admin | Список категорий |
| `create.php` | `POST` | admin | Создание категории |
| `update.php` | `POST` | admin | Обновление категории |
| `toggle-active.php` | `POST` | admin | Включение/отключение категории |

Файлы:

```txt
docs/backend/admin/categories/index.php.md
docs/backend/admin/categories/create.php.md
docs/backend/admin/categories/update.php.md
docs/backend/admin/categories/toggle-active.php.md
```

## Place Types

Папка:

```txt
api/admin/place-types/
```

Документация:

```txt
docs/backend/admin/place-types/
```

| Endpoint | Метод | Доступ | Назначение |
|---|---|---|---|
| `index.php` | `GET` | admin | Список типов объектов |
| `create.php` | `POST` | admin | Создание типа объекта |
| `update.php` | `POST` | admin | Обновление типа объекта |
| `toggle-active.php` | `POST` | admin | Включение/отключение типа объекта |

Файлы:

```txt
docs/backend/admin/place-types/index.php.md
docs/backend/admin/place-types/create.php.md
docs/backend/admin/place-types/update.php.md
docs/backend/admin/place-types/toggle-active.php.md
```

## Attributes

Папка:

```txt
api/admin/attributes/
```

Документация:

```txt
docs/backend/admin/attributes/
```

| Endpoint | Метод | Доступ | Назначение |
|---|---|---|---|
| `index.php` | `GET` | admin/moderator | Список характеристик |
| `create.php` | `POST` | admin | Создание характеристики |
| `update.php` | `POST` | admin | Обновление характеристики |
| `delete.php` | `POST` | admin | Удаление характеристики |

Файлы:

```txt
docs/backend/admin/attributes/index.php.md
docs/backend/admin/attributes/create.php.md
docs/backend/admin/attributes/update.php.md
docs/backend/admin/attributes/delete.php.md
```

## Dictionaries

Папка:

```txt
api/admin/dictionaries/
```

Документация:

```txt
docs/backend/admin/dictionaries/
```

| Endpoint | Метод | Доступ | Назначение |
|---|---|---|---|
| `index.php` | `GET` | admin/moderator | Список справочников и значений |
| `create-group.php` | `POST` | admin | Создание справочника |
| `update-group.php` | `POST` | admin | Обновление справочника |
| `create-value.php` | `POST` | admin | Создание значения справочника |
| `update-value.php` | `POST` | admin | Обновление значения справочника |
| `delete-value.php` | `POST` | admin | Удаление значения справочника |

Файлы:

```txt
docs/backend/admin/dictionaries/index.php.md
docs/backend/admin/dictionaries/create-group.php.md
docs/backend/admin/dictionaries/update-group.php.md
docs/backend/admin/dictionaries/create-value.php.md
docs/backend/admin/dictionaries/update-value.php.md
docs/backend/admin/dictionaries/delete-value.php.md
```

## Mailings

Папка:

```txt
api/admin/mailings/
```

Документация:

```txt
docs/backend/admin/mailings/
```

| Endpoint | Метод | Доступ | Назначение |
|---|---|---|---|
| `index.php` | `GET` | admin | Список рассылок |
| `options.php` | `GET` | admin | Данные для формы рассылки |
| `preview.php` | `POST` | admin | Расчёт количества получателей |
| `send.php` | `POST` | admin | Создание рассылки как черновика |
| `delete.php` | `POST` | admin | Удаление черновика |

Файлы:

```txt
docs/backend/admin/mailings/index.php.md
docs/backend/admin/mailings/options.php.md
docs/backend/admin/mailings/preview.php.md
docs/backend/admin/mailings/send.php.md
docs/backend/admin/mailings/delete.php.md
```

## Moderator Logs

Папка:

```txt
api/admin/moderator-logs/
```

Документация:

```txt
docs/backend/admin/moderator-logs/
```

| Endpoint | Метод | Доступ | Назначение |
|---|---|---|---|
| `index.php` | `GET` | admin | Логи действий модераторов и сотрудников |

Файлы:

```txt
docs/backend/admin/moderator-logs/index.php.md
```

## Dashboard

Папка:

```txt
api/admin/dashboard/
```

Документация:

```txt
docs/backend/admin/dashboard/
```

| Endpoint | Метод | Доступ | Назначение |
|---|---|---|---|
| `index.php` | `GET` | admin/moderator | Краткие счётчики панели управления |

Файлы:

```txt
docs/backend/admin/dashboard/index.php.md
```

## Statistics

Папка:

```txt
api/admin/statistics/
```

Документация:

```txt
docs/backend/admin/statistics/
```

| Endpoint | Метод | Доступ | Назначение |
|---|---|---|---|
| `index.php` | `GET` | admin/moderator | Расширенная статистика админки |

Файлы:

```txt
docs/backend/admin/statistics/index.php.md
```

## Settings

Папка:

```txt
api/admin/settings/
```

Документация:

```txt
docs/backend/admin/settings/
```

| Endpoint | Метод | Доступ | Назначение |
|---|---|---|---|
| `index.php` | `GET` | admin | Получение настроек сайта |
| `update.php` | `POST` | admin | Обновление настроек сайта |

Файлы:

```txt
docs/backend/admin/settings/index.php.md
docs/backend/admin/settings/update.php.md
```

## Database

Папка документации:

```txt
docs/backend/admin/database/
```

| Файл | Назначение |
|---|---|
| `admin-api-tables.md` | SQL-таблицы admin API |

Файл:

```txt
docs/backend/admin/database/admin-api-tables.md
```

## Access matrix

## Только admin

```txt
access-codes/*
auth/login-admin.php
categories/*
mailings/*
moderator-logs/*
payments/*
plans/*
settings/*
shared/require-admin.php
shared/moderator-log.php
```

Также только admin:

```txt
attributes/create.php
attributes/update.php
attributes/delete.php

dictionaries/create-group.php
dictionaries/update-group.php
dictionaries/create-value.php
dictionaries/update-value.php
dictionaries/delete-value.php

place-types/create.php
place-types/update.php
place-types/toggle-active.php

users/update-role.php
users/update-status.php
users/update-subscription.php
users/make-moderator.php
users/generate-moderator-code.php
```

## Admin или moderator

```txt
appeals/*
attributes/index.php
dashboard/index.php
dictionaries/index.php
places/*
reports/*
reviews/*
statistics/index.php
users/index.php
users/show.php
```

## Public для входа

```txt
auth/login-admin.php
auth/login-code.php
```

Эти endpoint-ы не требуют существующей admin-сессии, потому что сами создают её.

## Session endpoints

```txt
auth/me.php
auth/logout.php
```

## Основные таблицы

Admin API использует следующие таблицы:

```txt
users
roles
admin_access_codes
moderator_logs
places
categories
place_types
attribute_definitions
place_attributes
reference_groups
reference_values
reports
reviews
appeals
plans
user_subscriptions
payments
site_settings
mailings
mailing_recipients
```

## Важные замечания

### 1. Вход по коду работает через user_id

Актуальная схема входа по коду:

```txt
admin_access_codes.user_id -> users.id
```

Код доступа должен быть привязан к реальному пользователю-модератору.

### 2. Старые access-codes без user_id не подходят для login-code.php

Если код не привязан к пользователю, `login-code.php` вернёт:

```txt
Код доступа не привязан к пользователю
```

### 3. Mailings доступны только admin

В актуальной версии с хоста все endpoint-ы `api/admin/mailings/*` используют:

```php
requireAdmin();
```

### 4. Payments доступны только admin

Платежи закрыты через:

```php
requireAdmin();
```

### 5. Settings доступны только admin

Настройки сайта закрыты через:

```php
requireAdmin();
```

### 6. Moderator logs доступны только admin

Просмотр логов модераторов закрыт через:

```php
requireAdmin();
```

### 7. Есть расхождение статусов reports в dashboard

В `reports/close.php` жалоба переводится в:

```txt
resolved
```

А в `dashboard/index.php` считается:

```txt
closed_reports_count
```

по условию:

```sql
WHERE status = 'closed'
```

Если в базе нет статуса `closed`, этот счётчик будет всегда `0`.

## Рекомендуемый порядок чтения

Если нужно быстро понять admin API, читать в таком порядке:

```txt
shared/require-admin.php.md
auth/login-admin.php.md
auth/login-code.php.md
users/index.php.md
places/index.php.md
reports/index.php.md
reviews/index.php.md
appeals/index.php.md
dashboard/index.php.md
statistics/index.php.md
```

Если нужно понять справочники и структуру мест:

```txt
categories/index.php.md
place-types/index.php.md
attributes/index.php.md
dictionaries/index.php.md
```

Если нужно понять коммерческую часть:

```txt
plans/index.php.md
payments/index.php.md
users/update-subscription.php.md
```

## Статус завершения

По скрину папки:

```txt
/www/native-places.ru/api/admin/
```

были видны 19 папок.

Все 19 папок разобраны и оформлены:

```txt
access-codes       готово
appeals            готово
attributes         готово
auth               готово
categories         готово
dashboard          готово
dictionaries       готово
mailings           готово
moderator-logs     готово
payments           готово
place-types        готово
places             готово
plans              готово
reports            готово
reviews            готово
settings           готово
shared             готово
statistics         готово
users              готово
```