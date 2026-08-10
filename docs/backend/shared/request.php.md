# api/shared/request.php

## Статус

| Поле | Значение |
|---|---|
| Целевая версия backend | да |
| Полный PHP-код | да |
| Дата подготовки | 2026-08-09 |
| Путь на хосте | `/www/native-places.ru/api/shared/request.php` |
| Секреты в документе | нет |

## Назначение

Общая проверка HTTP-метода и безопасное чтение JSON-тела запроса.

## Изменения этой версии

- Новый общий модуль уменьшает дублирование endpoint-кода.

## Проверка после загрузки

1. Выполнить `php -l /www/native-places.ru/api/shared/request.php` или проверить синтаксис в панели хостинга.
2. Выполнить связанный пользовательский сценарий по инструкции из архива.
3. Не добавлять реальные пароли и персональные данные в этот документ.

## PHP-код

```php
<?php

function requireHttpMethod(string ...$allowedMethods): void
{
    $requestMethod = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    $allowedMethods = array_map('strtoupper', $allowedMethods);

    if (!in_array($requestMethod, $allowedMethods, true)) {
        header('Allow: ' . implode(', ', $allowedMethods));
        errorResponse('Метод запроса не поддерживается', 405);
    }
}

function readJsonBody(): array
{
    $rawBody = file_get_contents('php://input');

    if ($rawBody === false) {
        errorResponse('Не удалось прочитать тело запроса', 400);
    }

    try {
        $input = json_decode($rawBody, true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException $e) {
        errorResponse('Некорректный JSON', 400);
    }

    if (!is_array($input)) {
        errorResponse('Некорректный JSON', 400);
    }

    return $input;
}

```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-08-09 | Подготовлена исправленная полная версия по результатам сверки frontend, backend и структуры БД. |
