# Native Places — backend API по PHP-файлам

Дата составления: 2026-06-18  
Источник: PHP-код API, присланный частями в переписке. Старые Markdown-документы в `docs/` при составлении не использовались как источник истины.

> Важно: файл является документацией по фактически присланным PHP endpoint-ам, а не полным дампом backend-репозитория. В присланном тексте были повторяющиеся блоки; в этом документе дубликаты объединены.

## Общий формат API

### Базовый JSON-ответ

Все endpoint-ы используют общий helper `successResponse()` / `errorResponse()`:

```json
{
  "success": true,
  "data": {}
}
```

```json
{
  "success": false,
  "message": "Текст ошибки",
  "extra": {}
}
```

### CORS

Разрешённые origin:

* `https://native-places.ru`
* `http://localhost:5173`
* `http://localhost:5174`

Разрешены методы: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`.  
Разрешены headers: `Content-Type`, `Authorization`.  
Включено `Access-Control-Allow-Credentials: true`.

### Авторизация

Авторизация основана на PHP-сессии:

* при входе `api/auth/login.php` вызывает `session_start()` и кладёт `$_SESSION['user_id']`;
* защищённые endpoint-ы используют `requireAuth()` из `api/shared/auth.php`;
* `requireAuth()` возвращает текущий `user_id` или отдаёт `401`.

### База данных

Подключение через PDO MySQL с настройками:

* `PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION`
* `PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC`
* `PDO::ATTR_EMULATE_PREPARES => false`
* charset `utf8mb4`

Пароль БД в присланном фрагменте отсутствовал/был обрезан.

## Endpoint-ы

### Shared / служебные файлы

| Файл | Назначение |
| --- | --- |
| `api/shared/cors.php` | CORS-настройки и обработка `OPTIONS`. |
| `api/shared/response.php` | Единый JSON-формат успешных и ошибочных ответов. |
| `api/shared/auth.php` | Получение текущего пользователя и обязательная авторизация. |
| `api/config/database.php` | PDO-подключение к MySQL/MariaDB. |

## Auth

### `POST /auth/register.php`

Регистрация пользователя.

**Тело JSON:**

| Поле | Тип | Обязательное | Правила |
| --- | --- | --- | --- |
| `email` | string | да | Валидный email, уникальный в `users`. |
| `password` | string | да | Минимум 6 символов. |
| `first_name` | string | да | Не пустое. |
| `profile_status` | string | нет | Максимум 255 символов. |
| `phone` | string | нет | Без дополнительной валидации. |
| `telegram` | string | нет | Без дополнительной валидации. |

**Успех:** `201`, возвращает сообщение и созданного пользователя.  
**Ошибки:** `422` валидация, `409` email уже существует, `500` ошибка регистрации.

### `POST /auth/login.php`

Вход пользователя.

**Тело JSON:**

| Поле | Тип | Обязательное | Правила |
| --- | --- | --- | --- |
| `email` | string | да | Валидный email. |
| `password` | string | да | Не пустой. |

**Логика:**

* ищет пользователя по email;
* проверяет `status = active`;
* проверяет пароль через `password_verify()`;
* записывает `$_SESSION['user_id']`.

**Успех:** `200`, `authenticated: true`, объект пользователя без `password_hash`.  
**Ошибки:** `401` неверный email/пароль, `403` пользователь заблокирован/удалён, `422`, `500`.

### `GET /auth/me.php`

Проверка текущей сессии.

**Успех без сессии:** `authenticated: false`, `user: null`.  
**Успех с активной сессией:** `authenticated: true`, объект пользователя.  
Если пользователь не найден или не `active`, сессия уничтожается.

### `POST /auth/logout.php`

Выход из аккаунта.

**Логика:** очищает `$_SESSION`, удаляет session cookie, вызывает `session_destroy()`.  
**Успех:** `authenticated: false`, `user: null`.

## Profile

### `GET /profile/index.php`

Требует авторизацию. Возвращает профиль текущего пользователя с ролью.

**Успех:** `user`.  
**Ошибки:** `401`, `404`, `500`.

### `POST /profile/update.php`

Требует авторизацию. Обновляет профиль.

**Тело JSON:**

| Поле | Тип | Обязательное | Правила |
| --- | --- | --- | --- |
| `first_name` | string | да | Не пустое. |
| `profile_status` | string | нет | До 255 символов. |
| `phone` | string | нет | Без дополнительной валидации. |
| `telegram` | string | нет | Без дополнительной валидации. |

**Успех:** сообщение и обновлённые поля профиля.  
**Ошибки:** `401`, `422`, `500`.

### `POST /profile/avatar.php`

Требует авторизацию. Загружает аватар.

**FormData:**

| Поле | Тип | Обязательное | Правила |
| --- | --- | --- | --- |
| `avatar` | file | да | MIME: `image/jpeg`, `image/png`, `image/webp`; максимум 3 МБ. |

**Логика:** сохраняет файл в `/uploads/avatars`, обновляет `users.avatar`.  
**Успех:** путь `avatar`.  
**Ошибки:** `400`, `401`, `422`, `500`.

## Public places / справочники

### `GET /places/index.php`

Публичный список опубликованных объектов.

**Query:**

| Параметр | Тип | Обязательный | Назначение |
| --- | --- | --- | --- |
| `category` | string | нет | Фильтр по `categories.code`. |
| `type` | string | нет | Фильтр по `place_types.code`. |
| `commercial` | int/string | нет | Фильтр по `places.is_commercial`. |
| `booking` | string | нет | Фильтр по `places.booking_type`. |
| `q` | string | нет | LIKE-поиск по названию, описаниям, адресу, категории и типу. |

**Успех:** `places`, `filters`.  
**Особенность:** без пагинации и лимита.

### `GET /places/search.php`

Публичный поиск объектов. Похож на `/places/index.php`, но `q` обязателен.

**Ошибки:** `400`, если `q` пустой.

### `GET /places/map.php`

Публичный список объектов для карты.

**Query:** `category`, `type`, `commercial`, `booking`, `q`.  
**Фильтры:** только `published`, активные категория и тип, `latitude IS NOT NULL`, `longitude IS NOT NULL`.  
**Успех:** `places`, `filters`.  
**Особенность:** без bbox, пагинации и лимита.

### `GET /places/show.php`

Публичная карточка опубликованного объекта.

**Query:**

| Параметр | Обязательный |
| --- | --- |
| `slug` | да |

**Успех:** `place`, `images`, `attributes`.  
**Ошибки:** `400`, `404`, `500`.

`attributes` возвращаются из `place_attributes` вместе с активными `attribute_definitions` и нужны для вывода динамических полей в публичной карточке объявления. Ожидаемые поля элемента `attributes`:

| Поле | Назначение |
| --- | --- |
| `attribute_definition_id` | ID определения характеристики (`ad.id`). |
| `code` | Код характеристики, например `price`, `season`, `rules`. |
| `title` | Название поля для вывода в карточке. |
| `field_type` | Тип поля из определения. |
| `sort_order` | Порядок вывода. |
| `value` | Сохранённое значение объекта. |

### `GET /places/featured.php`

Возвращает 6 последних опубликованных объектов.

### `GET /places/filters.php`

Возвращает категории, типы, `publication_types`, `booking_types`, `commercial_options`.

### `POST /places/validate.php`

Проверяет минимальные поля формы объекта.

**Тело JSON:** `title`, `category`, `type`.  
**Успех:** сообщение `Проверка пройдена`.  
**Ошибки:** `422` с `errors`.

### `GET /places/create-options.php`

Возвращает данные для формы создания: категории, типы, тарифы, типы публикации, типы бронирования, commercial options.

### `GET /places/types-by-category.php`

**Query:** `category` — обязательный код категории.  
Возвращает активные типы объектов выбранной категории.

### `GET /categories/index.php`

Возвращает активные категории.

### `GET /place-types/index.php`

Возвращает активные типы объектов. Может фильтровать по `category`.

### `GET /reference-values/index.php`

Возвращает справочные значения.

**Query:**

| Параметр | Обязательный | Назначение |
| --- | --- | --- |
| `group` | нет | Если передан, фильтрует по `reference_groups.code`. |

### `GET /plans/index.php`

Возвращает активные тарифы.

### `GET /stats/index.php`

Возвращает количество опубликованных объектов, активных категорий и активных типов объектов.

## My places

### `GET /my-places/index.php`

Требует авторизацию. Возвращает все объекты текущего пользователя.

### `POST /my-places/create.php`

Требует авторизацию. Создаёт черновой объект.

**Тело JSON:**

| Поле | Тип | Обязательное |
| --- | --- | --- |
| `title` | string | да |
| `category_id` | int | да |
| `place_type_id` | int | да |

**Логика:**

* генерирует `slug = uniqid('place_')`;
* создаёт объект со статусом `pending`;
* `publication_type = free`, `payment_status = not_required`;
* координаты по умолчанию `0`, `0`.

### `GET /my-places/show.php`

Требует авторизацию. Возвращает объект текущего пользователя по `place_id`, его изображения и характеристики.

### `POST /my-places/update.php`

Требует авторизацию. Обновляет основной набор полей объекта.

**Тело JSON:**

| Поле | Тип | Обязательное |
| --- | --- | --- |
| `id` | int | да |
| `title` | string | да |
| `short_description` | string | нет |
| `full_description` | string | нет |
| `address` | string | нет |
| `latitude` | number/string | нет |
| `longitude` | number/string | нет |
| `contact_name` | string | нет |
| `phone` | string | нет |
| `telegram` | string | нет |
| `email` | string | нет |
| `website` | string | нет |
| `booking_type` | string | нет |
| `booking_url` | string | нет |

### `POST /my-places/delete.php`

Требует авторизацию. Не удаляет физически, а переводит объект в статус `expired`.

**Тело JSON:** `place_id`.  
**Успех:** статус `expired`.

## Place images

### `GET /place-images/index.php`

Требует авторизацию. Возвращает фотографии объекта владельца.

**Query:** `place_id`.

### `POST /place-images/upload.php`

Требует авторизацию. Загружает фото объекта.

**FormData:**

| Поле | Тип | Обязательное | Правила |
| --- | --- | --- | --- |
| `place_id` | int | да | Объект должен принадлежать пользователю. |
| `image` | file | да | MIME: JPG/PNG/WEBP, максимум 5 МБ. |

**Ограничение:** максимум 15 фотографий на объект.  
**Логика:** первая фотография становится обложкой.

### `POST /place-images/delete.php`

Требует авторизацию. Удаляет фотографию владельца объекта и файл с диска. Если удалена обложка, назначает следующую фотографию обложкой или очищает `cover_image`.

**Тело JSON:** `image_id`.

### `POST /place-images/set-cover.php`

Требует авторизацию. Назначает фотографию обложкой.

**Тело JSON:** `image_id`.

> В присланном тексте были две версии этого endpoint-а. В одной операции идут без транзакции и обновляют `updated_at`, во второй — с транзакцией, но без `updated_at`. Нужно сверить, какая версия реально лежит на хосте.

### `POST /place-images/reorder.php`

Требует авторизацию. Меняет порядок фотографий.

**Тело JSON:**

| Поле | Тип | Обязательное |
| --- | --- | --- |
| `place_id` | int | да |
| `image_ids` | int[] | да |

**Логика:** проверяет, что все фотографии принадлежат указанному объекту, затем обновляет `sort_order` в транзакции.

## Place attributes

### `GET /place-attributes/definitions.php`

Возвращает активные определения характеристик для категории.

**Query:** `category_id` — обязательный.

### `GET /place-attributes/index.php`

Требует авторизацию. Возвращает сохранённые характеристики объекта владельца.

**Query:** `place_id`.

### `POST /place-attributes/save.php`

Требует авторизацию. Сохраняет характеристики объекта владельца.

**Тело JSON:**

| Поле | Тип | Обязательное |
| --- | --- | --- |
| `place_id` | int | да |
| `attributes` | array | да |

Элемент `attributes`:

| Поле | Тип |
| --- | --- |
| `attribute_definition_id` | int |
| `value` | string |

**Логика:** для каждого валидного определения удаляет старое значение и вставляет новое, если оно не пустое. Операция в транзакции.

## Favorites

### `GET /favorites/index.php`

Требует авторизацию. Возвращает избранные объекты текущего пользователя.

### `POST /favorites/toggle.php`

Требует авторизацию. Добавляет или удаляет объект из избранного.

**Тело JSON:** `place_id`.  
**Логика:** объект должен быть `published`.

### `GET /favorites/check.php`

Проверяет, находится ли объект в избранном.

**Query:** `place_id`.  
Если пользователь не авторизован, возвращает `is_favorite: false`.

## Conversations / Messages

### `GET /conversations/index.php`

Требует авторизацию. Возвращает диалоги, где пользователь является владельцем объекта или инициатором диалога.

### `POST /conversations/start.php`

Требует авторизацию. Создаёт диалог по опубликованному объекту или возвращает существующий.

**Тело JSON:** `place_id`.  
**Правила:**

* объект должен быть `published`;
* у объекта должен быть владелец;
* нельзя создать диалог с самим собой.

### `GET /messages/index.php`

Требует авторизацию. Возвращает сообщения диалога.

**Query:** `conversation_id`.  
**Доступ:** только владелец объекта или пользователь диалога.

### `POST /messages/send.php`

Требует авторизацию. Отправляет сообщение в диалог.

**Тело JSON:**

| Поле | Тип | Обязательное |
| --- | --- | --- |
| `conversation_id` | int | да |
| `message_text` | string | да |

**Логика:** вставляет сообщение и обновляет `conversations.last_message_at`.

## Routes

### `GET /routes/index.php`

Требует авторизацию. Возвращает маршруты текущего пользователя с количеством точек.

### `POST /routes/create.php`

Требует авторизацию. Создаёт маршрут.

**Тело JSON:**

| Поле | Тип | Обязательное |
| --- | --- | --- |
| `title` | string | да |
| `description` | string | нет |
| `is_public` | bool | нет |

**Логика:** генерирует `share_token = bin2hex(random_bytes(16))`.

### `GET /routes/show.php`

Требует авторизацию. Возвращает маршрут пользователя и его точки.

**Query:** `route_id`.

### `POST /routes/update.php`

Требует авторизацию. Обновляет активный маршрут пользователя.

**Тело JSON:** `route_id`, `title`, `description`, `is_public`.

### `POST /routes/delete.php`

Требует авторизацию. Физически удаляет маршрут и его `route_places` в транзакции.

**Тело JSON:** `route_id`.

### `POST /routes/add-place.php`

Требует авторизацию. Добавляет опубликованный объект в активный маршрут.

**Тело JSON:** `route_id`, `place_id`, `note`.  
**Правила:** объект не должен уже быть в маршруте.

### `POST /routes/remove-place.php`

Требует авторизацию. Удаляет точку маршрута пользователя.

**Тело JSON:** `route_place_id`.

### `POST /routes/reorder.php`

Требует авторизацию. Меняет порядок точек маршрута.

**Тело JSON:** `route_id`, `items` — массив `route_place_id`.

### `GET /routes/share.php`

Публичный endpoint. Возвращает публичный маршрут по токену.

**Query:** `token`.  
**Правила:** `routes.is_public = 1`, точки только по опубликованным объектам.

### `GET /routes/archive-index.php`

Требует авторизацию. Возвращает архивные и завершённые маршруты текущего пользователя.

### `POST /routes/archive.php`

Требует авторизацию. Переводит маршрут в статус `archived`.

**Тело JSON:** `route_id`.

### `POST /routes/restore.php`

Требует авторизацию. Возвращает маршрут в статус `active`, очищает `archived_at` и `completed_at`.

**Тело JSON:** `route_id`.

### `POST /routes/complete.php`

Требует авторизацию. Переводит активный маршрут в статус `completed`.

**Тело JSON:** `route_id`.

## Reviews

### `GET /reviews/index.php`

Публичный endpoint. Возвращает опубликованные отзывы объекта.

**Query:** `place_id`.  
**Правила:** объект должен быть `published`, отзывы только `status = published`.

### `POST /reviews/create.php`

Требует авторизацию. Создаёт отзыв.

**Тело JSON:**

| Поле | Тип | Обязательное | Правила |
| --- | --- | --- | --- |
| `place_id` | int | да | Объект должен быть опубликован. |
| `review_text` | string | да | Минимум 10 символов. |

**Логика:** один отзыв пользователя на один объект, новый отзыв получает `status = pending`.

### `GET /reviews/my.php`

Требует авторизацию. Возвращает отзывы текущего пользователя.

## Reports

### `POST /reports/create.php`

Требует авторизацию. Создаёт жалобу на опубликованный объект.

**Тело JSON:**

| Поле | Тип | Обязательное |
| --- | --- | --- |
| `place_id` | int | да |
| `report_type` | string | да |
| `message` | string | да |

**Логика:** жалоба создаётся со статусом `new`.

### `GET /reports/my.php`

Требует авторизацию. Возвращает жалобы текущего пользователя.

## Notifications

### `GET /notifications/index.php`

Требует авторизацию. Возвращает уведомления текущего пользователя и `unread_count`.

### `POST /notifications/read.php`

Требует авторизацию. Отмечает одно уведомление прочитанным.

**Тело JSON:** `notification_id`.

### `POST /notifications/read-all.php`

Требует авторизацию. Отмечает все непрочитанные уведомления пользователя прочитанными.

## Appeals

### `GET /appeals/my.php`

Требует авторизацию. Возвращает обращения текущего пользователя.

### `POST /appeals/create.php`

Требует авторизацию. Создаёт обращение.

**Тело JSON:**

| Поле | Тип | Обязательное | Правила |
| --- | --- | --- | --- |
| `type` | string | да | Только `support` или `idea`. |
| `contact` | string | нет | Опционально. |
| `message` | string | да | Не пустое. |

**Логика:** создаёт обращение со статусом `new`.

## Замечания по рискам и расхождениям

### 1. Нет пагинации и лимитов на списковые endpoint-ы

Затронуты минимум:

* `/places/index.php`
* `/places/search.php`
* `/places/map.php`
* `/favorites/index.php`
* `/conversations/index.php`
* `/messages/index.php`
* `/notifications/index.php`
* `/reviews/index.php`
* `/reports/my.php`
* `/appeals/my.php`

Риск: рост нагрузки на БД и frontend, особенно для карты и сообщений.

### 2. LIKE-поиск без ограничения длины запроса

`q` используется в нескольких `LIKE '%...%'` условиях. SQL-инъекция снижена за счёт prepared statements, но возможна высокая нагрузка на БД при длинных запросах и отсутствии полнотекстовых индексов.

### 3. Ошибки backend возвращают `$e->getMessage()` клиенту

Во многих `catch` блоках в `extra.error` отдаётся текст исключения. Это удобно для разработки, но в production может раскрыть внутренние детали SQL, путей и конфигурации.

### 4. CSRF нужно проверять отдельно

API работает с cookie-сессиями и `Access-Control-Allow-Credentials: true`. В присланном коде не видно CSRF-токенов или проверки `Origin`/`Referer` для POST endpoint-ов. Если session cookie не имеет строгого `SameSite`, возможен CSRF-риск.

### 5. Нет rate limiting

В присланных endpoint-ах не видно ограничения частоты запросов. Наиболее чувствительные места:

* регистрация;
* логин;
* отправка сообщений;
* создание жалоб;
* создание отзывов;
* загрузка файлов;
* поиск и карта.

### 6. Upload endpoint-ы проверяют MIME и размер, но не пережимают изображения

Проверка `mime_content_type()` и лимиты размера есть. Но не видно:

* пересохранения изображения через GD/Imagick;
* удаления EXIF;
* проверки реальной декодируемости изображения;
* генерации thumbnails;
* защиты от накопления старых avatar-файлов.

### 7. Координаты и URL почти не валидируются

В `my-places/update.php` latitude/longitude, email, website, booking_url сохраняются почти как пришли. Это не SQL-инъекция из-за prepared statements, но может приводить к мусорным данным и проблемам отображения на frontend.

### 8. Возможны гонки при toggle/insert

Например, `favorites/toggle.php`, `reviews/create.php`, `conversations/start.php` сначала проверяют наличие записи, затем вставляют. Без уникальных индексов на уровне БД возможны дубликаты при параллельных запросах.

### 9. Несогласованность статусов объектов

`my-places/create.php` создаёт `pending`, публичные endpoint-ы смотрят `published`, а `my-places/delete.php` архивирует в `expired`. Frontend может использовать термин `archived`, поэтому статусы нужно привести к единому словарю.

### 10. Публичный `/places/show.php` должен стабильно возвращать attributes

Актуальная версия на хосте возвращает `place`, `images` и `attributes`. Это важно сохранить как обязательный контракт: frontend использует `attributes` для вывода дополнительных полей, разных для каждой категории, в публичной карточке объявления.

### 11. В присланном тексте есть дубли и разные версии файлов

Особенно заметно для:

* `api/place-images/set-cover.php`;
* блоков `places/*`, `auth/*`, `reviews/*`, `reports/*`.

Перед внесением правок на хосте стоит сверить реальную актуальную версию файлов.
