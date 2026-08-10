# api/shared/auth.php

## Статус

| Поле | Значение |
|---|---|
| Целевая версия backend | да |
| Полный PHP-код | да |
| Дата подготовки | 2026-08-09 |
| Путь на хосте | `/www/native-places.ru/api/shared/auth.php` |
| Секреты в документе | нет |

## Назначение

Возвращает ID текущего пользователя и прерывает защищённый запрос при отсутствии авторизации.

## Изменения этой версии

- Запуск сессии передан единому shared/session.php.

## Проверка после загрузки

1. Выполнить `php -l /www/native-places.ru/api/shared/auth.php` или проверить синтаксис в панели хостинга.
2. Выполнить связанный пользовательский сценарий по инструкции из архива.
3. Не добавлять реальные пароли и персональные данные в этот документ.

## PHP-код

```php
<?php

require_once __DIR__ . '/session.php';

function getCurrentUserId(): ?int
{
    startAppSession();

    if (empty($_SESSION['user_id'])) {
        return null;
    }

    return (int) $_SESSION['user_id'];
}

function requireAuth(): int
{
    $userId = getCurrentUserId();

    if (!$userId) {
        errorResponse('Требуется авторизация', 401);
    }

    return $userId;
}

```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-08-09 | Подготовлена исправленная полная версия по результатам сверки frontend, backend и структуры БД. |
