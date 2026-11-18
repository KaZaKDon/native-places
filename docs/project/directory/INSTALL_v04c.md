# Native Places v0.4c — безопасная установка и откат

**Не устанавливать серверный ZIP до подтверждения локальных двух Vite-сборок и сохранения резервных копий. Работаем по одной проверке.**

### Шаги (поочерёдно, не все сразу)

1. Локально сделать резервную копию проекта, наложить SOURCE ZIP на `E:\Project\native-places`, выполнить `npm --prefix admin run build`, затем `npm run build`. Код не загружать на хост до подтверждения.
2. Сделать полный экспорт MySQL `vnuko1796_nativeplaces_dev`. Проверить 8 действующих `directory_*` таблиц и что `directory_species.id` — BIGINT UNSIGNED/InnoDB. **Никогда не запускать миграцию на другой БД.**
3. Импортировать `db/migrations/20261117_directory_species_publication_v04c.sql`. Ожидается **один запрос** и одна новая таблица `directory_species_events` (всего 9 `directory_*` таблиц). В существующие записи рыбы миграция не вносит изменений.
4. Сохранить серверные резервные копии `seo-router.php`, `sitemap.php`, `seo/directory.php`, `api/directory/show.php`. Зафиксировать текущую версию этих файлов; API находится на хостинге, в локальном репозитории только текстовые копии.
5. Разместить **новые** PHP-файлы (не изменяя работающие):

   - `api/admin/directory/species/publication.php`
   - `api/directory/species/_bootstrap.php`, `index.php`, `show.php`
   - `api/directory/image.php`
   - `seo/species.php`

   Физический путь: `/www/native-places.ru/api/...` и `/www/native-places.ru/seo/...`. **Не создавать `/www/native-places.ru/admin/directory/`** — этот каталог уже вызывал конфликт маршрута SPA и 403.
6. Проверить без авторизации: `curl.exe -i https://native-places.ru/api/admin/directory/species/publication.php` должен отказать в доступе (GET может вернуть 405, а POST — 401); `curl.exe -i "https://native-places.ru/api/directory/species/show.php?slug=okun-rechnoy"` — 404 JSON до публикации; `curl.exe -I "https://native-places.ru/api/directory/image.php?id=1"` **не** использовать: endpoint принимает только GET, для картинки проверить GET через `curl.exe -i` с `-o` во внешний файл.
7. После проверки загрузить **изменённые PHP-файлы**: `api/directory/show.php`, `seo/directory.php`, `seo-router.php`, `sitemap.php`. Сначала проверять опубликованный `/directory/river/don` (200) и ещё неопубликованный `/directory/species/okun-rechnoy` (404). Sitemap до публикации не должен содержать окуня.
8. Сохранить существующий frontend админки, загрузить `admin/dist` в действующую папку `/admin/`, без создания `/admin/directory/`. Проверить админку и кнопку публикации; **не нажимать до обновления публичного React.**
9. Сохранить публичные файлы, загрузить содержимое корневого `dist` в `/www/native-places.ru/`. Не удалять `api/`, `seo/`, `admin/`, `uploads/`, `.htaccess`, php-файлы. Проверить публичные страницы, F5, SEO.
10. Отдельно выполнить публикацию окуня в админке и проверить API, изображение, страницу Дона, карточку окуня и Sitemap. При ошибке **снять вид с публикации** и посмотреть ответ API; не повторять миграцию.

### Откат

- Сначала снять вид с публикации в админке (если он был опубликован). Это должно скрыть его, привязки и публичное изображение одним действием.
- Восстановить резервные версии React `dist`, `admin/dist`, изменённых PHP/SEO-файлов. Новые endpoints могут остаться закрытыми и неиспользуемыми до исправления.
- Таблицу `directory_species_events` не удалять автоматически: журнал действий и миграция не должны теряться при откате кода. При необходимости восстановить полную MySQL-копию с учётом новых данных.
- При ошибке 403 на `/admin/directory` проверять физическую папку `/admin/directory/`, не перемещать PHP из `/api/admin/directory/`.
