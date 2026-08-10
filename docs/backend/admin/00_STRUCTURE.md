# Native Places Admin Backend — фактическая структура

Дата фиксации: 9 августа 2026 года

Этот файл перечисляет существующие документы в `docs/backend/admin`, соответствующие `/api/admin/` на хосте.

## Дерево

```text
docs/backend/admin/
├── README.md
├── 00_STRUCTURE.md
├── access-codes/
│   ├── create.php.md
│   ├── disable.php.md
│   └── index.php.md
├── appeals/
│   ├── index.php.md
│   ├── show.php.md
│   └── update.php.md
├── attributes/
│   ├── create.php.md
│   ├── delete.php.md
│   ├── index.php.md
│   └── update.php.md
├── auth/
│   ├── login-admin.php.md
│   ├── login-code.php.md
│   ├── logout.php.md
│   └── me.php.md
├── categories/
│   ├── create.php.md
│   ├── index.php.md
│   ├── toggle-active.php.md
│   └── update.php.md
├── dashboard/
│   └── index.php.md
├── database/
│   └── admin-api-tables.md
├── dictionaries/
│   ├── create-group.php.md
│   ├── create-value.php.md
│   ├── delete-value.php.md
│   ├── index.php.md
│   ├── update-group.php.md
│   └── update-value.php.md
├── mailings/
│   ├── delete.php.md
│   ├── index.php.md
│   ├── options.php.md
│   ├── preview.php.md
│   ├── process.php.md
│   ├── send.php.md
│   └── start.php.md
├── moderator-logs/
│   └── index.php.md
├── payments/
│   ├── index.php.md
│   └── show.php.md
├── place-types/
│   ├── create.php.md
│   ├── index.php.md
│   ├── toggle-active.php.md
│   └── update.php.md
├── places/
│   ├── archive.php.md
│   ├── index.php.md
│   ├── publish.php.md
│   ├── reject.php.md
│   └── show.php.md
├── plans/
│   ├── create.php.md
│   ├── index.php.md
│   ├── paid-test-tariff.md
│   └── update.php.md
├── reports/
│   ├── close.php.md
│   ├── index.php.md
│   └── show.php.md
├── reviews/
│   ├── index.php.md
│   ├── publish.php.md
│   ├── reject.php.md
│   └── show.php.md
├── settings/
│   ├── index.php.md
│   └── update.php.md
├── shared/
│   ├── moderator-log.php.md
│   └── require-admin.php.md
├── statistics/
│   └── index.php.md
└── users/
    ├── generate-moderator-code.php.md
    ├── index.php.md
    ├── make-moderator.php.md
    ├── show.php.md
    ├── update-role.php.md
    ├── update-status.php.md
    └── update-subscription.php.md
```

## Соответствие путей

```text
api/admin/<раздел>/<файл>.php
docs/backend/admin/<раздел>/<файл>.php.md
```

Примеры:

| Хост | Документ |
|---|---|
| `api/admin/auth/login-admin.php` | `docs/backend/admin/auth/login-admin.php.md` |
| `api/admin/places/publish.php` | `docs/backend/admin/places/publish.php.md` |
| `api/admin/users/show.php` | `docs/backend/admin/users/show.php.md` |
| `api/admin/mailings/process.php` | `docs/backend/admin/mailings/process.php.md` |
| `api/admin/payments/show.php` | `docs/backend/admin/payments/show.php.md` |

## Доступ

Общие серверные проверки находятся в:

```text
shared/require-admin.php.md
shared/moderator-log.php.md
```

Конкретный уровень доступа определяется вызовом `requireAdmin()` или `requireAdminOrModerator()` в PHP-коде endpoint-а.

## Правило структуры

- существующий документ не удаляется без проверки соответствующего файла на хосте;
- новый файл на хосте добавляется в то же относительное место в `docs/backend/admin`;
- файл-план не выдаётся за endpoint, но подтверждённые рабочие документы хоста сохраняются;
- `plans/paid-test-tariff.md` остаётся в текущем разделе;
- endpoint-документы не редактируются массово до пункта 7.3 инвентаризации.
