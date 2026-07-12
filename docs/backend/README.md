# Native Places Backend API Docs

Эта папка содержит структурированную документацию PHP backend API проекта Native Places.

Документация предназначена для связки backend на PHP с frontend-приложением. Реальный PHP-код находится на хосте и используется в production/staging-среде. Markdown-файлы в этой папке нужны для удобной навигации, описания контрактов API, фиксации request/response-структур и обсуждения доработок.

## Назначение документации

Документация в `docs/backend` помогает:

- быстро найти нужный PHP endpoint;
- понять метод, URL, параметры запроса и формат ответа;
- зафиксировать требования к авторизации;
- описать frontend-сценарии использования endpoint-а;
- сохранить важные backend-заметки;
- держать рядом актуальный PHP-код или его фрагмент для сверки.

## Принцип организации

Основной принцип:

```text
один PHP endpoint = один .php.md файл
```

Например:

```text
api/auth/login.php
```

документируется как:

```text
docs/backend/user/auth/login.php.md
```

А endpoint:

```text
api/places/index.php
```

документируется как:

```text
docs/backend/public/places/index.php.md
```

## Основные разделы

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
    routes/

  user/
    auth/
    profile/
    my-places/
    my-subscription/
    conversations/
    messages/

  payments/
    plans/
    payments/

  admin/
    shared/
    auth/
    dashboard/
    settings/
    dictionaries/
    users/
```

## Статусы endpoint-ов

В каждом endpoint-документе используется блок статуса:

| Поле | Значение |
|---|---|
| Backend на хосте | да / нет / уточнить |
| Код сверено с хостом | да / нет / уточнить |
| Подключено на фронте | да / нет / частично / уточнить |
| Нужны правки backend | да / нет / уточнить |
| Нужны правки frontend | да / нет / уточнить |

## Рекомендуемый шаблон endpoint-файла

```md
# api/path/to/file.php

## Статус

| Поле | Значение |
|---|---|
| Backend на хосте | да |
| Код сверено с хостом | да |
| Источник | исходный Markdown-документ |
| Подключено на фронте | уточнить |

## Назначение

Краткое описание endpoint-а.

## Метод и URL

```http
GET /api/path/to/file.php
```

## Авторизация

Описание требований к авторизации.

## Request

Описание query params, JSON body или form-data.

## Success response

Пример успешного JSON-ответа.

## Error responses

Таблица возможных ошибок.

## Frontend notes

Заметки для frontend-интеграции.

## Backend notes

Заметки по PHP-логике, таблицам БД, статусам и ограничениям.

## PHP-код

```php
<?php
// Актуальный PHP-код или фрагмент.
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-04 | Документ структурирован из существующих Markdown-описаний. |
```

## Правила работы с этой папкой

1. Старые Markdown-файлы не удаляются автоматически.
2. Новая структура используется как удобная frontend/backend-документация.
3. Если endpoint уже есть на хосте, это явно указывается в статусе.
4. Если контракт требует уточнения, это отмечается как `уточнить`.
5. PHP-код внизу документа нужен для сверки, но основная ценность файла — контракт API.