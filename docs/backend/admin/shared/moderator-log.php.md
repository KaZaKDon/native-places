# api/admin/shared/moderator-log.php

## Статус

| Поле | Значение |
|---|---|
| Раздел | Admin / Shared |
| Тип | PHP helper |
| Авторизация | Нет самостоятельной авторизации |
| Используется в | Admin endpoints с логированием действий |
| Источник | Код с хоста `api/admin/shared/moderator-log.php` |
| Готовность | Готово к переносу в новую структуру |

## Назначение

Содержит helper-функцию `writeModeratorLog()` для записи действий администратора или модератора в таблицу `moderator_logs`.

Функция используется в admin endpoint-ах, где нужно зафиксировать действие:

- публикация объявления;
- отклонение объявления;
- архивирование объявления;
- создание/обновление справочников;
- создание/обновление категорий;
- создание/обновление типов объектов;
- создание/обновление характеристик;
- управление подписками;
- управление обращениями;
- другие действия модерации.

## Подключения

```php
require_once __DIR__ . '/../../config/database.php';
```

Файл подключает только базу данных.

Файл не подключает `response.php`, потому что сам не формирует HTTP-ответы.

## Функции

## writeModeratorLog()

```php
function writeModeratorLog(
    int $moderatorId,
    string $actionType,
    string $entityType,
    int $entityId,
    ?string $description = null,
    ?PDO $pdo = null
): void
```

### Назначение

Записывает строку в таблицу `moderator_logs`.

### Параметры

| Параметр | Тип | Обязательный | Описание |
|---|---:|---:|---|
| `moderatorId` | int | да | ID администратора или модератора |
| `actionType` | string | да | Тип действия |
| `entityType` | string | да | Тип сущности |
| `entityId` | int | да | ID сущности |
| `description` | string/null | нет | Описание действия |
| `pdo` | PDO/null | нет | Готовое подключение к БД |

## Логика работы

1. Проверяет, что `moderatorId > 0`.
2. Проверяет, что `entityId > 0`.
3. Обрезает пробелы у `actionType` и `entityType`.
4. Проверяет, что `actionType` не пустой.
5. Проверяет, что `entityType` не пустой.
6. Обрезает `actionType` до 50 символов.
7. Обрезает `entityType` до 50 символов.
8. Нормализует `description`.
9. Использует переданный `$pdo` или создаёт новое подключение через `getDatabaseConnection()`.
10. Записывает лог в `moderator_logs`.

## Валидация

### Некорректный ID модератора

Если:

```php
$moderatorId <= 0
```

будет выброшено исключение:

```php
throw new InvalidArgumentException('Некорректный ID модератора для лога');
```

### Некорректный ID сущности

Если:

```php
$entityId <= 0
```

будет выброшено исключение:

```php
throw new InvalidArgumentException('Некорректный ID сущности для лога');
```

### Пустой actionType

Если:

```php
$actionType === ''
```

будет выброшено исключение:

```php
throw new InvalidArgumentException('Не передан тип действия для лога');
```

### Пустой entityType

Если:

```php
$entityType === ''
```

будет выброшено исключение:

```php
throw new InvalidArgumentException('Не передан тип сущности для лога');
```

## Нормализация

### `actionType`

```php
$actionType = trim($actionType);
$actionType = substr($actionType, 0, 50);
```

### `entityType`

```php
$entityType = trim($entityType);
$entityType = substr($entityType, 0, 50);
```

### `description`

Если описание передано, оно обрезается через `trim`.

Если после `trim` описание стало пустым, сохраняется `NULL`.

```php
if ($description !== null) {
    $description = trim($description);

    if ($description === '') {
        $description = null;
    }
}
```

## SQL insert

```sql
INSERT INTO moderator_logs (
    moderator_id,
    action_type,
    entity_type,
    entity_id,
    description,
    created_at
) VALUES (
    :moderator_id,
    :action_type,
    :entity_type,
    :entity_id,
    :description,
    NOW()
)
```

## Пример использования

```php
writeModeratorLog(
    (int) $adminUser['id'],
    'publish',
    'place',
    $placeId,
    'Опубликовано объявление: ' . $placeTitle,
    $pdo
);
```

## Пример записи

```json
{
  "moderator_id": 1,
  "action_type": "publish",
  "entity_type": "place",
  "entity_id": 123,
  "description": "Опубликовано объявление: Название места",
  "created_at": "2026-07-05 12:00:00"
}
```

## Frontend notes

- Этот файл напрямую frontend-ом не вызывается.
- Результаты работы этой функции можно смотреть через:
  ```txt
  api/admin/moderator-logs/index.php
  ```
- Если endpoint, который пишет лог, падает из-за ошибки логирования, frontend получит ошибку самого endpoint-а.

## Backend notes

- Функция может использовать уже открытую транзакцию, если передать `$pdo`.
- Если `$pdo` не передан, функция сама создаст подключение через `getDatabaseConnection()`.
- В большинстве endpoint-ов лучше передавать `$pdo`, чтобы запись лога была частью общей транзакции.
- Функция выбрасывает исключения при некорректных входных данных.
- Исключения должны быть перехвачены в вызывающем endpoint-е через `try/catch`.

## PHP-код

```php
<?php

require_once __DIR__ . '/../../config/database.php';

function writeModeratorLog(
    int $moderatorId,
    string $actionType,
    string $entityType,
    int $entityId,
    ?string $description = null,
    ?PDO $pdo = null
): void {
    if ($moderatorId <= 0) {
        throw new InvalidArgumentException('Некорректный ID модератора для лога');
    }

    if ($entityId <= 0) {
        throw new InvalidArgumentException('Некорректный ID сущности для лога');
    }

    $actionType = trim($actionType);
    $entityType = trim($entityType);

    if ($actionType === '') {
        throw new InvalidArgumentException('Не передан тип действия для лога');
    }

    if ($entityType === '') {
        throw new InvalidArgumentException('Не передан тип сущности для лога');
    }

    $actionType = substr($actionType, 0, 50);
    $entityType = substr($entityType, 0, 50);

    if ($description !== null) {
        $description = trim($description);

        if ($description === '') {
            $description = null;
        }
    }

    $connection = $pdo ?: getDatabaseConnection();

    $stmt = $connection->prepare("
        INSERT INTO moderator_logs (
            moderator_id,
            action_type,
            entity_type,
            entity_id,
            description,
            created_at
        ) VALUES (
            :moderator_id,
            :action_type,
            :entity_type,
            :entity_id,
            :description,
            NOW()
        )
    ");

    $stmt->execute([
        'moderator_id' => $moderatorId,
        'action_type' => $actionType,
        'entity_type' => $entityType,
        'entity_id' => $entityId,
        'description' => $description,
    ]);
}
```

## История изменений

| Дата | Изменение |
|---|---|
| 2026-07-05 | Файл оформлен по коду с хоста и перенесён в структуру `docs/backend/admin/shared`. |