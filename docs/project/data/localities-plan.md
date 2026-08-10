# Native Places — план фильтрации по населённым пунктам

Дата: 2026-06-18

## Решение

Для фильтрации объектов по населённым пунктам выбран вариант с отдельной таблицей населённых пунктов. Это нужно, чтобы пользователь мог искать не просто «квартира», а «квартира в Шахтах», «рыбалка в Вёшенской», «дом в Ростовской области» и получать релевантную выдачу, а не объекты со всего сайта.

Этот вариант лучше подходит для расширения проекта, потому что населённый пункт становится нормализованной сущностью, а не свободным текстом в адресе.

## Почему не достаточно фильтра по `address`

Фильтрация по строке адреса выглядит бы простой, но быстро создаст проблемы:

* разные варианты написания: `Шахты`, `г. Шахты`, `город Шахты`;
* ошибки в адресах;
* сложность автодополнения;
* невозможность надёжно строить SEO-страницы;
* сложно отличать населённый пункт от слова в описании;
* сложно центрировать карту на выбранном городе или станице.

Поэтому `address` должен остаться человекочитаемым адресом, а населённый пункт должен храниться отдельно.

## Предлагаемая модель данных

### Таблица `localities`

```sql
CREATE TABLE localities (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    region VARCHAR(255) NOT NULL,
    district VARCHAR(255) NULL,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 7) NULL,
    longitude DECIMAL(10, 7) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_localities_slug (slug),
    KEY idx_localities_region (region),
    KEY idx_localities_title (title),
    KEY idx_localities_is_active_sort (is_active, sort_order, title)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Поле в `places`

```sql
ALTER TABLE places
    ADD COLUMN locality_id INT UNSIGNED NULL AFTER place_type_id,
    ADD KEY idx_places_locality_id (locality_id),
    ADD CONSTRAINT fk_places_locality
        FOREIGN KEY (locality_id)
        REFERENCES localities(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL;
```

Если хостинг/текущая схема затрудняет добавление foreign key, можно временно добавить только `locality_id` и индекс, а внешний ключ включить позже.

## Что хранить в `places`

В `places` должны быть разные поля с разным смыслом:

| Поле | Назначение |
| --- | --- |
| `locality_id` | Нормализованная привязка к населённому пункту для фильтрации, SEO и карты. |
| `address` | Человекочитаемый адрес: улица, хутор, ориентир, подробности. |
| `latitude` / `longitude` | Конкретная точка объекта на карте. |

Не стоит использовать `address` как основной фильтр по городу.

## Пример данных

```sql
INSERT INTO localities (
    region,
    district,
    title,
    slug,
    latitude,
    longitude,
    sort_order
) VALUES
('Ростовская область', NULL, 'Шахты', 'shahty', 47.7085, 40.2159, 10),
('Ростовская область', 'Шолоховский район', 'Вёшенская', 'vyoshenskaya', 49.6336, 41.7336, 20),
('Ростовская область', NULL, 'Ростов-на-Дону', 'rostov-na-donu', 47.2225, 39.7188, 30);
```

## Backend API

### `GET /localities/index.php`

Возвращает список активных населённых пунктов.

**Query:**

| Параметр | Тип | Обязательный | Назначение |
| --- | --- | --- | --- |
| `q` | string | нет | Поиск по `title`, `district`, `region`. |
| `region` | string | нет | Фильтр по региону. |
| `limit` | int | нет | Ограничение размера выдачи, например `50`. |

**Ответ:**

```json
{
  "success": true,
  "data": {
    "localities": [
      {
        "id": 1,
        "region": "Ростовская область",
        "district": null,
        "title": "Шахты",
        "slug": "shahty",
        "latitude": "47.7085000",
        "longitude": "40.2159000"
      }
    ]
  }
}
```

### `GET /localities/search.php`

Опциональный отдельный endpoint для autocomplete. Можно не делать отдельно, если `index.php?q=` достаточно быстрый.

**Query:**

| Параметр | Тип | Обязательный |
| --- | --- | --- |
| `q` | string | да |

Минимальная длина `q`: 2 символа.

## Изменения в существующих endpoint-ах

### `GET /places/index.php`

Добавить фильтр:

```txt
locality=shahty
```

Или, если frontend работает с ID:

```txt
locality_id=1
```

Рекомендуемый публичный вариант — `locality=slug`, потому что он лучше для URL.

### `GET /places/map.php`

Добавить такой же фильтр:

```txt
locality=shahty
```

Для карты это особенно важно: не нужно грузить все объекты страны/региона, если пользователь ищет объекты в конкретном городе.

### `GET /places/search.php`

Добавить фильтр населённого пункта:

```txt
q=квартира&locality=shahty
```

Так запрос «квартира в Шахтах» должен превращаться не в свободный LIKE по всей базе, а в структурный фильтр:

```txt
category/type/search + locality
```

### `GET /places/show.php`

Желательно возвращать данные населённого пункта вместе с объектом:

```txt
locality_id
locality_title
locality_slug
locality_region
locality_district
```

Это поможет карточке объекта, SEO и хлебным крошкам.

### `/places/create-options.php`

Добавить `localities` или сделать отдельный запрос `/localities/index.php`.

Для масштабирования лучше отдельный endpoint, чтобы не грузить большой список населённых пунктов вместе со всеми опциями формы.

### `/my-places/create.php` и `/my-places/update.php`

Добавить сохранение `locality_id`.

Новые объявления должны требовать выбранный населённый пункт. Для старых объектов можно временно разрешить `NULL`, пока идёт миграция.

## SQL-идея для фильтра объектов

```sql
SELECT
    p.id,
    p.title,
    p.slug,
    p.short_description,
    p.cover_image,
    p.address,
    p.latitude,
    p.longitude,

    l.id AS locality_id,
    l.title AS locality_title,
    l.slug AS locality_slug,
    l.region AS locality_region,
    l.district AS locality_district,

    c.code AS category_code,
    c.title AS category_title,

    pt.code AS type_code,
    pt.title AS type_title
FROM places p
INNER JOIN categories c ON c.id = p.category_id
INNER JOIN place_types pt ON pt.id = p.place_type_id
LEFT JOIN localities l ON l.id = p.locality_id
WHERE p.status = 'published'
  AND c.is_active = 1
  AND pt.is_active = 1
  AND (:locality = '' OR l.slug = :locality)
ORDER BY p.created_at DESC;
```

На практике условие `(:locality = '' OR ...)` можно заменить динамической сборкой SQL, как уже сделано в текущих PHP endpoint-ах.

## Frontend UX

### Главная страница

Поиск должен разделять «что» и «где»:

```txt
Что ищем?        Где?
[Квартира]       [Шахты]
```

После отправки:

```txt
/map?locality=shahty&category=real-estate&type=apartment
```

### Карта

В sidebar нужен отдельный фильтр населённого пункта:

```txt
Населённый пункт
[Шахты ▼]

Категория
[Недвижимость]

Тип
[Квартира]
```

Текстовый поиск остаётся, но он должен уточнять выдачу внутри выбранного населённого пункта, а не заменять фильтр по месту.

### Форма подачи объявления

Добавить обязательное поле:

```txt
Населённый пункт
[Выберите город / станицу / хутор]
```

Отдельно оставить:

```txt
Адрес или ориентир
[улица, дом, описание места]
```

### Карточка объекта

Показывать населённый пункт отдельно от полного адреса:

```txt
Шахты, Ростовская область
ул. Советская, 10
```

## SEO-направление

После стабилизации фильтра можно сделать страницы:

```txt
/shahty
/shahty/real-estate
/shahty/real-estate/apartments
/vyoshenskaya/fishing
```

Но сначала достаточно query URL:

```txt
/map?locality=shahty&category=real-estate
```

## Миграция существующих объектов

1. Добавить таблицу `localities`.
2. Заполнить первичные населённые пункты.
3. Добавить `places.locality_id`.
4. Для существующих объектов попытаться определить населённый пункт по `address`.
5. Где автоматически не получилось — заполнить вручную через админку или SQL.
6. Для новых объектов сделать `locality_id` обязательным на frontend и backend.
7. После миграции добавить индекс/ограничения и начать использовать фильтр в `/places/*`.

## Приоритет внедрения

1. Таблица `localities` и поле `places.locality_id`.
2. Endpoint `GET /localities/index.php`.
3. Фильтр `locality` в `/places/index.php` и `/places/map.php`.
4. Выбор населённого пункта в форме подачи объявления.
5. Выбор населённого пункта на карте и главной.
6. Миграция старых объектов.
7. SEO-страницы по населённым пунктам.

## Важное правило контракта

Frontend не должен угадывать населённый пункт из `address`. Backend должен отдавать нормализованные поля:

```txt
locality_id
locality_title
locality_slug
locality_region
locality_district
```

А фильтры должны использовать `locality_id` или `locality_slug`.
