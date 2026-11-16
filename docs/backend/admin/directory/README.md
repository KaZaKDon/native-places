# Административный API справочника

Текстовые копии действующего на хосте v0.1 `_bootstrap.php`, `index.php`, `save.php` и **нового v0.3** `publication.php`. Все рабочие PHP-файлы находятся **на хостинге** в `/www/native-places.ru/api/admin/directory/`.

В v0.3 добавить только `publication.php`; прежние файлы не перезаписывать. Метод `POST`, роль `admin`, CSRF из `GET index.php`, действие `publish` или `unpublish`, транзакция и аудит.

Опубликованную запись нельзя редактировать через v0.1 `save.php`: сначала снять с публикации.
