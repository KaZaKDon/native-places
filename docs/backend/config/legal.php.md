# api/config/legal.php

## Статус

| Поле | Значение |
|---|---|
| Целевая версия backend | да |
| Полный PHP-код | да |
| Дата подготовки | 2026-08-09 |
| Путь на хосте | `/www/native-places.ru/api/config/legal.php` |
| Секреты в документе | нет |

## Назначение

Возвращает действующие версии документов, фиксируемые при регистрации.

## Изменения этой версии

- Версии больше не зашиты непосредственно в register.php.

## Проверка после загрузки

1. Выполнить `php -l /www/native-places.ru/api/config/legal.php` или проверить синтаксис в панели хостинга.
2. Выполнить связанный пользовательский сценарий по инструкции из архива.
3. Не добавлять реальные пароли и персональные данные в этот документ.

## PHP-код

```php
<?php

require_once __DIR__ . '/env.php';

function getLegalDocumentVersions(): array
{
    static $versions = null;

    if ($versions !== null) {
        return $versions;
    }

    $versions = [
        'user_agreement' => envString('LEGAL_USER_AGREEMENT_VERSION', '1.0'),
        'platform_rules' => envString('LEGAL_PLATFORM_RULES_VERSION', '1.0'),
        'personal_data' => envString('LEGAL_PERSONAL_DATA_CONSENT_VERSION', '1.0'),
        'marketing_emails' => envString('LEGAL_MARKETING_CONSENT_VERSION', '1.0'),
    ];

    return $versions;
}

```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-08-09 | Подготовлена исправленная полная версия по результатам сверки frontend, backend и структуры БД. |
