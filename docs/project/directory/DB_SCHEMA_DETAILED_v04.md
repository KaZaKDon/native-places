# Native Places — v0.4: подробная схема БД (проект, не SQL-миграция)

**Дата:** 16.11.2026. **Статус:** техническая спецификация для поэтапной разработки, **НЕ развёрнута**. PHP API и MySQL/MariaDB находятся на хостинге; локально — React и текстовые копии API в `docs/backend/`. Перед SQL получить `SHOW CREATE TABLE` действующих таблиц и проверить реальные серверные файлы.

## 0. Текущая production-основа v0.3 — не изменять

### `directory_entries` — существует

| Поле | SQL-тип (факт из миграции v0.1) | Назначение |
|---|---|---|
| `id` | BIGINT UNSIGNED PK AUTO_INCREMENT | ID информационного объекта |
| `slug` | VARCHAR(160) UNIQUE | Общий уникальный адрес **по всем типам**, не уникальность внутри типа |
| `type` | VARCHAR(32) | Сейчас разрешены `river`, `lake`, `forest`, `natural_area`, `hunting_ground`, `landmark`, `spring` |
| `title` | VARCHAR(180) | Название |
| `region` | VARCHAR(160) | Регион (текст) |
| `summary` | VARCHAR(500) | Краткое описание |
| `body` | TEXT | Подробный текст, API ограничивает 10 000 символами |
| `source_url` | VARCHAR(700) | Одна ссылка-источник; для v0.4 недостаточно, но остаётся для совместимости |
| `geometry_geojson` | MEDIUMTEXT NULL | Геометрия Geometry-объекта GeoJSON, хранится как текст |
| `status` | VARCHAR(20) | `draft` / `published` |
| `created_by_admin_id` | BIGINT UNSIGNED | Администратор-создатель; внешний ключ не объявлен в существующей миграции |
| `created_at`, `updated_at` | TIMESTAMP | История дат |
| `published_at` | TIMESTAMP NULL | Дата публикации |

Индексы: `PRIMARY(id)`, `UNIQUE(slug)`, `(type,status)`, `(updated_at)`.

### `directory_entry_events` — существует

`id BIGINT UNSIGNED PK`, `directory_entry_id BIGINT UNSIGNED` → FK `directory_entries.id` (`ON DELETE RESTRICT`), `admin_user_id BIGINT UNSIGNED`, `action VARCHAR(24)`, `event_at TIMESTAMP`; индекс `(directory_entry_id,event_at)`.

**Текущие правила v0.3:** редактирование только черновиков; опубликованный объект сначала снимаем с публикации. Публикация требует `summary ≥ 40` символов, `body ≥ 120` символов, чтобы тексты не совпадали, и непустой `source_url`. Админские POST: сессия, `requireAdmin()`, CSRF. Проверка GeoJSON: 250 000 байт, ≤20 000 точек и соответствие геометрии типу. Эти факты подтверждены исходным PHP; новые ограничения ниже — **предложения**.

## 1. Восемь новых таблиц v0.4 — предлагаемые поля

Все ID — `BIGINT UNSIGNED AUTO_INCREMENT`; текстовые значения — UTF-8 (`utf8mb4`). Схема ориентирована на MariaDB 10.5 хостинга, но окончательные DDL и FK проверяются перед миграцией. Публичные запросы фильтруют статусы дочерних записей **и** родительского объекта.

### 1.1 `directory_segments` — именованные участки рек (v0.4a)

| Поле | Предлагаемый тип | Обязательность / смысл |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | Авто-ID |
| `river_entry_id` | BIGINT UNSIGNED FK → `directory_entries.id` | Обязательно; родитель должен быть типа `river` (проверка API) |
| `slug` | VARCHAR(160) | Обязательно; уникален **внутри одной реки** |
| `title` | VARCHAR(180) | Обязательно; например «Вёшенской участок» |
| `sort_order` | INT UNSIGNED | Порядок от верховья к низовью / ручной порядок; не предполагает географическую точность |
| `locality` | VARCHAR(180) | Ближайший населённый пункт, если подтверждён |
| `summary` | VARCHAR(500) | Краткое описание |
| `body` | TEXT | Особенности течения/берегов и прочие проверенные факты |
| `geometry_geojson` | MEDIUMTEXT NULL | `LineString` / `MultiLineString`, WGS84; обязательность для карты, необязательно для черновика |
| `geometry_source_id` | BIGINT UNSIGNED FK → `directory_sources.id` NULL | Источник линии/даты |
| `status` | VARCHAR(20) | `draft` / `published`; публикация только при `river.status=published` |
| `created_by_admin_id` | BIGINT UNSIGNED | Аудит (FK к реальной таблице пользователей после сверки) |
| `created_at`, `updated_at`, `published_at` | TIMESTAMP | История |

Ограничения и индексы: `UNIQUE(river_entry_id,slug)`, `INDEX(river_entry_id,status,sort_order)`, FK `ON DELETE RESTRICT`. Не превращать автоматически четыре OSM-сегмента Дона в четыре именованных участка; их границы нужно обосновать. На общей карте сохраняем один объект Дон; дочерние участки показываем только при выборе реки или в карточке.

### 1.2 `directory_species` — единая база биологических видов (v0.4b)

| Поле | Предлагаемый тип | Смысл |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | ID вида |
| `slug` | VARCHAR(160) UNIQUE | Стабильный путь |
| `kind` | VARCHAR(32) | `fish`, `bird`, `mammal`, `plant`, `other` — расширяемый контролируемый список |
| `common_name` | VARCHAR(180) | Русское название |
| `scientific_name` | VARCHAR(180) NULL | Научное название, когда проверено |
| `summary` | VARCHAR(500) | Отличительные особенности |
| `body` | TEXT | Подробный текст с фактами |
| `status` | VARCHAR(20) | `draft` / `published` |
| `created_at`, `updated_at`, `published_at` | TIMESTAMP | История |

Индексы: `UNIQUE(slug)`, `(kind,status)`, полнотекстовый поиск можно добавить позднее. **Не** делать глобальное поле «ловля разрешена»: ограничения зависят от региона, времени, территории и правил. Вид не дублируется по каждому водоёму.

### 1.3 `directory_species_occurrences` — где вид подтверждён (v0.4b)

| Поле | Тип | Смысл |
|---|---|---|
| `id` | BIGINT UNSIGNED PK | ID записи |
| `species_id` | BIGINT UNSIGNED FK → `directory_species.id` | Вид |
| `entry_id` | BIGINT UNSIGNED FK → `directory_entries.id` | Основной объект: река, ООПТ и т. п. |
| `segment_id` | BIGINT UNSIGNED FK → `directory_segments.id` NULL | Конкретный участок, если это доказано |
| `source_id` | BIGINT UNSIGNED FK → `directory_sources.id` | Источник факта |
| `evidence_level` | VARCHAR(24) | `official`, `research`, `verified_observation` и т. п.; **не** произвольное утверждение |
| `notes` | TEXT | Условия и оговорки |
| `verified_at` | DATE | Дата проверки сведений |
| `status` | VARCHAR(20) | `draft` / `published` |

Индексы: `(entry_id,segment_id,status)`, `(species_id,status)`, `(source_id)`. API проверяет `segment.river_entry_id = entry_id` и предотвращает повторы (учитывать, что `UNIQUE` с NULL в MariaDB допускает несколько NULL). Связь с рекой **не** доказывает присутствие на каждом её участке. При чувствительной природоохранной информации не раскрывать точные координаты.

### 1.4 `directory_sources` — единые источники (v0.4a, база для остальных)

`id PK`, `title VARCHAR(250) NOT NULL`, `source_kind VARCHAR(32)` (`official`, `osm`, `scientific`, `licensed_media`, `observation`, `other`), `publisher VARCHAR(250)`, `url VARCHAR(1000) NOT NULL` (**пустая строка допустима, URL необязателен для любых типов источников**), `accessed_at DATE NOT NULL`, `published_on DATE NULL`, `license_name VARCHAR(180) NULL`, `license_url VARCHAR(1000) NULL`, `comment TEXT`, `created_at TIMESTAMP`. Индексы по `source_kind`, `accessed_at`; URL проверяется как HTTP(S), только если он заполнен. При пустом URL дедупликацию по ссылке нельзя выполнять: отдельные книги/наблюдения должны оставаться самостоятельными записями. Полезные выходные данные печатных изданий храним в `publisher`/`comment`. Отдельно фиксировать, **какой именно факт** подтверждает источник: карта OSM не доказывает наличие конкретной рыбы или правовой режим.

### 1.5 `directory_media` — библиотека изображений (v0.4b)

`id PK`, `storage_path VARCHAR(500) NOT NULL`, `mime VARCHAR(50)`, `width INT`, `height INT`, `size_bytes BIGINT`, `sha256 CHAR(64)`, `caption VARCHAR(300)`, `alt_text VARCHAR(300)`, `author VARCHAR(250) NOT NULL`, `license_name VARCHAR(180) NOT NULL`, `license_url VARCHAR(1000) NULL`, `source_url VARCHAR(1000) NULL`, `attribution TEXT`, `status VARCHAR(20)` (`draft` / `approved`), `created_at TIMESTAMP`, `created_by_admin_id BIGINT UNSIGNED`. Сохранять фото на нашем хостинге; санитизация, размер, формат, проверка MIME, безопасные имена, миниатюры и удаление EXIF. Не копировать чужие фото без права использования.

### 1.6 `directory_media_links` — назначение фото объектам/участкам/видам (v0.4b)

`id PK`, `media_id BIGINT UNSIGNED FK → directory_media.id`, `entry_id BIGINT UNSIGNED FK → directory_entries.id NULL`, `segment_id BIGINT UNSIGNED FK → directory_segments.id NULL`, `species_id BIGINT UNSIGNED FK → directory_species.id NULL`, `sort_order INT`, `is_cover TINYINT(1)`.

**Ровно одно** из `entry_id` / `segment_id` / `species_id` заполнено; проверить через `CHECK` (поддержку и фактическое поведение MariaDB 10.5 подтвердить при миграции) и в PHP. Для надёжной ссылочной целостности предпочтительнее три nullable FK, а не полиморфный `target_id`. Уникальность назначений по парам, контроль только одного cover на сущность — в API/транзакции.

### 1.7 `directory_protection` — официальный режим ООПТ (v0.4c)

`entry_id BIGINT UNSIGNED PRIMARY KEY FK → directory_entries.id`, `legal_subtype VARCHAR(40)` (заповедник / заказник / национальный парк / природный парк / памятник природы), `registry_number VARCHAR(120) NULL`, `authority VARCHAR(250)`, `legal_document_url VARCHAR(1000)`, `boundary_source_id BIGINT UNSIGNED FK → directory_sources.id NULL`, `visiting_rules TEXT`, `restriction_notes TEXT`, `rules_source_id BIGINT UNSIGNED FK → directory_sources.id NULL`, `rules_verified_at DATE`, `updated_at TIMESTAMP`. Соответствующая `directory_entries.type` должна быть `protected_area` — новый тип **не реализован в v0.3**, потребует обновления PHP/React/SEO. Официальные границы — только при подтверждении; нет доказанных границ → не показывать выдуманный полигон.

### 1.8 `directory_related_places` — связь с платными объявлениями (v0.4d)

`id PK`, `entry_id BIGINT UNSIGNED FK → directory_entries.id`, `place_id` — тип уточнить по **реальной** `places.id`, `relation_kind VARCHAR(32)` (`nearby`, `located_on`, `service` — после проверки фактов), `created_at TIMESTAMP`; `UNIQUE(entry_id,place_id)` + индексы в обе стороны. Ссылки показывать **только** для действующих опубликованных платных объявлений, без переноса цен/статусов и без обхода платежей. Удаление объявления не должно удалять реку.

## 2. Схема связей

```text
existing: directory_entries (river / lake / nature / ...)
  ├── 1:N directory_segments (только river)
  ├── 1:N directory_species_occurrences ── N:1 directory_species
  │                └── optional directory_segments (если факт подтверждён для участка)
  ├── 1:1 directory_protection (только protected_area)
  ├── N:N directory_media via directory_media_links
  └── N:N places via directory_related_places (платные объявления независимы)

directory_sources ── source IDs: segments / occurrences / protection
existing: directory_entry_events — текущий аудит основной записи
```

Аудит дочерних сущностей: на v0.4a добавить специализированную запись аудита либо расширить событийную модель после проверки схемы; не выдавать существующую `directory_entry_events` за полноценный аудит новых таблиц.

## 3. Порядок миграций

- **v0.4a:** `directory_sources` → `directory_segments`, сохранение/проверка GeoJSON; данные Дона не переносить и не удалять.
- **v0.4b:** `directory_species` → `directory_species_occurrences` → `directory_media` → `directory_media_links`.
- **v0.4c:** `protected_area` в реестрах PHP+React+SEO → `directory_protection`.
- **v0.4d:** `directory_related_places` только после проверки `SHOW CREATE TABLE places`, API опубликованных объявлений и модели оплаты.

**Перед каждой миграцией:** резервная копия БД и файлов сервера, `SHOW CREATE TABLE` затрагиваемых таблиц, проверка прав, тестовая миграция, откат, одна операция за шаг. Никаких `DROP`, `TRUNCATE` и изменения `places` в первом патче.


## Примечание о коде v0.4a (16.11.2026)

Схема двух таблиц `directory_sources` и `directory_segments` воплощена в файле `db/migrations/20261116_directory_segments_v04a.sql` серверного архива v0.4a. Это пока **подготовленный, не установленный** DDL; остальные шесть таблиц остаются проектом. Участки пока доступны только как черновики в админке. См. `RELEASE_v04a.md`.


## Уточнение реализации v0.4b (подготовлено, не установлено)

SQL `20261116_directory_species_media_v04b.sql` реализует `directory_species`, `directory_species_occurrences`, `directory_media`, `directory_media_links`; четыре таблицы v0.4a уже установлены. Для фотографий выбран приватный вариант хранения `image_data MEDIUMBLOB` и служебный `storage_path=db:private` вместо файлов в общедоступном каталоге. Это исключает прямой доступ к черновикам в случае игнорирования `.htaccess` хостингом; со временем можно мигрировать в отдельное закрытое файловое хранилище. Встречаемость видов и снимки остаются `draft`, публикации и SEO для них нет.


## Дополнение v0.4c — журнал публикации видов (пока миграция не выполнена)

`directory_species_events(id BIGINT UNSIGNED PK, species_id BIGINT UNSIGNED FK→directory_species.id, admin_user_id BIGINT UNSIGNED, action VARCHAR(24), event_at TIMESTAMP)`. Индекс `(species_id,event_at)`; допустимые действия в API: `publish`, `unpublish`. Отдельная таблица не изменяет структуру объявлений, статусов видов или медиа. Статусы `directory_species`, `directory_species_occurrences`, `directory_media` используются существующие `draft/published`; переключение только транзакционно и при выполнении серверных проверок.
