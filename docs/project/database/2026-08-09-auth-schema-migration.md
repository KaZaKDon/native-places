# Auth-схема Native Places после совместимой миграции

Дата: 9 августа 2026 года.  
СУБД: MariaDB 10.5.x.  
Статус документа: добавить в проект после успешного выполнения `02_VERIFY.sql`.

## Область миграции

Изменены таблицы:

```text
users
user_consents
email_verification_tokens
password_resets
```

## Связи пользователей

Колонки:

```text
user_consents.user_id
email_verification_tokens.user_id
password_resets.user_id
```

приведены к `BIGINT UNSIGNED` и связаны с `users.id` внешними ключами с `ON DELETE CASCADE`.

## Токены

SHA-256-хеши email-подтверждения и восстановления пароля хранятся как:

```text
CHAR(64) CHARACTER SET ascii COLLATE ascii_bin
```

Открытые токены в БД не сохраняются.

## Журнал согласий

`user_consents` сохраняет события, а не только одно текущее значение.

Основные поля:

| Поле | Назначение |
|---|---|
| `consent_type` | Тип согласия или документа. |
| `document_version` | Принятая или отозванная редакция. |
| `document_hash` | SHA-256 содержимого редакции; до подключения реестра может быть `NULL`. |
| `event_type` | `accepted` или `withdrawn`. |
| `event_at` | Время события. |
| `source` | Источник: регистрация, настройки, админская фиксация и т. п. |
| `accepted_at` | Временное совместимое поле старого PHP; для `withdrawn` может быть `NULL`. |
| `ip_address` | IP, зафиксированный сервером. |
| `user_agent` | User-Agent клиента. |

Старый уникальный индекс `(user_id, consent_type, document_version)` удалён, потому что он не позволял сохранить отзыв и повторное принятие одной редакции.

## Временная совместимость email

В таблице `users` пока сохранены оба поля:

```text
is_email_verified
email_verified_at
```

Их значения синхронизированы. Каноническим полем для frontend и будущего API является `email_verified_at`. `is_email_verified` удаляется отдельной миграцией после обновления всех PHP-файлов.

## Следующие задачи

1. Перевести PHP на запись `event_type`, `event_at`, `source` и `document_hash`.
2. Реализовать отзыв рекламного согласия отдельным событием `withdrawn`.
3. Подключить серверный реестр юридических документов.
4. Удалить `users.is_email_verified` после контрольного поиска всех обращений.
5. Проверить типы пользовательских ссылок во всех остальных таблицах проекта.
