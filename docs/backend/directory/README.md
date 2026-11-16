# Публичный PHP API справочника v0.3

Эти файлы — **текстовые копии** для локальной документации. Рабочий PHP размещается в `/www/native-places.ru/api/directory/` на хостинге. Копии не содержат паролей или production-конфигурации.

- `_bootstrap.php.md` — CORS, JSON-формат, общие проверки GET и преобразование GeoJSON.
- `index.php.md` — опубликованный список (24/страница).
- `show.php.md` — только published по type+slug; 404 для draft.
- `map.php.md` — опубликованный геослой, максимум 60 записей, `truncated` предупреждает об ограничении.

Схема БД — v0.1 `directory_entries`, `directory_entry_events`; новая миграция для v0.3 не нужна.
