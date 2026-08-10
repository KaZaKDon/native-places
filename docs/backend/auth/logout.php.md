# api/auth/logout.php

## Статус

| Поле | Значение |
|---|---|
| Целевая версия backend | да |
| Полный PHP-код | да |
| Дата подготовки | 2026-08-09 |
| Путь на хосте | `/www/native-places.ru/api/auth/logout.php` |
| Секреты в документе | нет |

## Назначение

Завершает пользовательскую сессию и удаляет session cookie.

## Метод и URL

```http
POST /api/auth/logout.php
```

## Изменения этой версии

- Использует единые функции startAppSession() и destroyAppSession().

## Проверка после загрузки

1. Выполнить `php -l /www/native-places.ru/api/auth/logout.php` или проверить синтаксис в панели хостинга.
2. Выполнить связанный пользовательский сценарий по инструкции из архива.
3. Не добавлять реальные пароли и персональные данные в этот документ.

## PHP-код

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/request.php';
require_once __DIR__ . '/../shared/session.php';

try {
    requireHttpMethod('POST');
    startAppSession();
    destroyAppSession();

    successResponse([
        'message' => 'Выход выполнен успешно',
        'authenticated' => false,
        'user' => null,
    ]);
} catch (Throwable $e) {
    error_log('[auth/logout] ' . $e::class . ': ' . $e->getMessage());
    errorResponse('Не удалось завершить сессию', 500);
}

```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-08-09 | Подготовлена исправленная полная версия по результатам сверки frontend, backend и структуры БД. |
