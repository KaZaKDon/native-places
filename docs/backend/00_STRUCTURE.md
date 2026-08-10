# Native Places Backend — фактическая структура

Дата фиксации: 9 августа 2026 года

Этот файл описывает существующее дерево `docs/backend`, которое повторяет структуру `/api/` на хосте. Это не целевая схема и не предложение о будущей реорганизации.

## Корень

```text
docs/backend/
├── README.md
├── 00_STRUCTURE.md
├── auth-session.md
├── response-format.md
├── admin/
├── appeals/
├── auth/
├── conversations/
├── favorites/
├── messages/
├── my-places/
├── my-subscription/
├── notifications/
├── payments/
├── place-attributes/
├── place-images/
├── places/
├── plans/
├── profile/
├── reports/
├── reviews/
├── routes/
├── seo/
└── shared/
```

## Пользовательский и публичный API

```text
appeals/             2 документа
auth/                4 документа
conversations/       2 документа
favorites/           3 документа
messages/            2 документа
my-places/           7 документов
my-subscription/     2 документа
notifications/       3 документа
payments/            3 документа
place-attributes/    3 документа
place-images/        5 документов
places/              9 документов
plans/               1 документ
profile/             4 документа
reports/             2 документа
reviews/             3 документа
routes/              13 документов
seo/                 1 документ
shared/              5 документов
```

Количество указывает текущее число Markdown-файлов в соответствующей папке и не является обещанием полноты API.

## Admin API

```text
admin/
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

Подробности: `docs/backend/admin/00_STRUCTURE.md`.

## Соответствие путей

| Файл на хосте | Копия в проекте |
|---|---|
| `api/auth/register.php` | `docs/backend/auth/register.php.md` |
| `api/auth/login.php` | `docs/backend/auth/login.php.md` |
| `api/places/index.php` | `docs/backend/places/index.php.md` |
| `api/my-places/create.php` | `docs/backend/my-places/create.php.md` |
| `api/payments/create.php` | `docs/backend/payments/create.php.md` |
| `api/routes/share.php` | `docs/backend/routes/share.php.md` |
| `api/admin/users/show.php` | `docs/backend/admin/users/show.php.md` |
| `api/admin/mailings/process.php` | `docs/backend/admin/mailings/process.php.md` |

## Общие документы

```text
auth-session.md             описание пользовательской сессии
response-format.md          общий формат JSON-ответов
shared/auth.php.md          точная копия auth helper
shared/cors.md              точная копия CORS helper в текущем имени документа
shared/database.php.md      точная копия подключения к базе
shared/response.php.md      точная копия response helper
shared/database.md          пояснения по работе с базой
```

Названия `shared/cors.md` и `profile/password.md` пока оставлены как в полученном архиве. Их переименование относится к отдельному шагу и не выполняется в пунктах 7.1–7.2.

## SEO и тестовый тариф

Следующие файлы подтверждены как часть фактической копии с хоста и остаются на месте:

```text
seo/sitemap.php.md
admin/plans/paid-test-tariff.md
```

## Правило актуализации

После изменения PHP на хосте:

1. обновляется полный код соответствующего `.php.md`;
2. описание сверяется с кодом;
3. фиксируется дата проверки;
4. проверяется frontend/admin-вызов;
5. обновляется история изменений.

До пункта 7.3 инвентаризации endpoint-документы и их служебные шапки не изменяются.
