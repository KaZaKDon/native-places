# Структура Backend API Docs

Этот файл описывает целевую структуру документации backend API.

Документация строится вокруг фактических PHP endpoint-ов, которые находятся на хосте. Каждый endpoint описывается отдельным Markdown-файлом с расширением `.php.md`.

## Корневая структура

```text
docs/backend/
  00_STRUCTURE.md
  README.md

  shared/
    response-format.md
    auth-session.md
    database.md
    cors.md

  public/
    places/
      create-options.php.md
      featured.php.md
      filters.php.md
      index.php.md
      map.php.md
      search.php.md
      show.php.md
      validate.php.md
    routes/
      share.php.md

  user/
    auth/
      register.php.md
      login.php.md
      logout.php.md
      me.php.md
    profile/
      password.php.md
    my-places/
      create.php.md
      delete.php.md
      index.php.md
      show.php.md
      update.php.md
    my-subscription/
      current.php.md
      change.php.md
    conversations/
      index.php.md
      start.php.md
    messages/
      index.php.md
      send.php.md

  payments/
    plans/
      index.php.md
    payments/
      create.php.md
      status.php.md
      yookassa-webhook.php.md

  admin/
    00_STRUCTURE.md
    shared/
      require-admin.php.md
    auth/
      login-admin.php.md
      login-code.php.md
      me.php.md
      logout.php.md
    dashboard/
      stats.php.md
    settings/
    dictionaries/
    users/
    teachers/
    students/
    teacher-documents/
```

## Разделы

### `shared/`

Общие правила backend API:

- формат JSON-ответов;
- авторизация через PHP-сессии;
- CORS;
- подключение к базе данных;
- общие helper-функции.

### `public/`

Публичные endpoint-ы, которые доступны без пользовательской авторизации.

Примеры:

- публичный список мест;
- поиск;
- карта;
- фильтры;
- публичная ссылка маршрута.

### `user/`

Endpoint-ы для обычного авторизованного пользователя.

Примеры:

- регистрация;
- вход;
- выход;
- текущий пользователь;
- профиль;
- мои объявления;
- моя подписка;
- диалоги;
- сообщения.

### `payments/`

Платёжный контур и тарифы.

Примеры:

- список тарифов;
- создание платежа;
- проверка статуса платежа;
- webhook Ю-Кассы.

### `admin/`

Административный backend API.

Примеры:

- вход администратора;
- проверка admin session;
- dashboard;
- управление пользователями;
- словари;
- настройки;
- роли администратора и модератора.

## Соответствие PHP endpoint-а и Markdown-файла

Примеры соответствия:

| PHP endpoint | Markdown-файл |
|---|---|
| `api/auth/login.php` | `docs/backend/user/auth/login.php.md` |
| `api/auth/logout.php` | `docs/backend/user/auth/logout.php.md` |
| `api/auth/me.php` | `docs/backend/user/auth/me.php.md` |
| `api/places/index.php` | `docs/backend/public/places/index.php.md` |
| `api/places/search.php` | `docs/backend/public/places/search.php.md` |
| `api/my-places/create.php` | `docs/backend/user/my-places/create.php.md` |
| `api/my-subscription/current.php` | `docs/backend/user/my-subscription/current.php.md` |
| `api/plans/index.php` | `docs/backend/payments/plans/index.php.md` |
| `api/payments/create.php` | `docs/backend/payments/payments/create.php.md` |
| `api/admin/auth/login-admin.php` | `docs/backend/admin/auth/login-admin.php.md` |
| `api/admin/shared/require-admin.php` | `docs/backend/admin/shared/require-admin.php.md` |

## Стандарт endpoint-документа

Каждый endpoint-файл должен содержать:

1. Заголовок с реальным PHP-путём.
2. Статус.
3. Назначение.
4. Метод и URL.
5. Авторизацию.
6. Request.
7. Success response.
8. Error responses.
9. Frontend notes.
10. Backend notes.
11. PHP-код или актуальный фрагмент.
12. Историю изменений.

## Статус endpoint-а

Рекомендуемый блок:

```md
## Статус

| Поле | Значение |
|---|---|
| Backend на хосте | да |
| Код сверено с хостом | да |
| Источник | `php-after-changes/example.md` |
| Подключено на фронте | уточнить |
| Нужны правки backend | нет |
| Нужны правки frontend | уточнить |
```

## Авторизация

В документации используются такие типы авторизации:

| Тип | Описание |
|---|---|
| Не требуется | Endpoint публичный. |
| User session | Требуется авторизация обычного пользователя через PHP session. |
| Admin session | Требуется авторизация администратора. |
| Admin or moderator session | Требуется роль администратора или модератора. |

## Формат ответов

Общий формат описан в:

```text
docs/backend/shared/response-format.md
```

## Авторизация и сессии

Общие правила описаны в:

```text
docs/backend/shared/auth-session.md
```

## Принцип обновления

Если PHP-код на хосте меняется, нужно обновить соответствующий `.php.md` файл:

1. Обновить request/response-контракт.
2. Обновить backend notes.
3. Обновить PHP-код или фрагмент.
4. Обновить дату в истории изменений.
5. Если нужно, отметить frontend-задачи.