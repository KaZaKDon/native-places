# Native Places — сверка frontend с backend

Дата сверки: 14.06.2026  
Источник backend: `api(16).docx`

## Frontend вызывает следующие API

### Авторизация

```txt
/auth/me.php
/auth/login.php
/auth/register.php
/auth/logout.php
/auth/forgot-password.php
/auth/reset-password.php
```

### Профиль

```txt
/profile/index.php
/profile/update.php
/profile/avatar.php
```

### Объекты и карта

```txt
/places/map.php
/places/show.php
/places/create-options.php
```

### Мои объявления

```txt
/my-places/index.php
/my-places/show.php
/my-places/create.php
/my-places/update.php
/my-places/delete.php
```

### Характеристики объявлений

```txt
/place-attributes/definitions.php
/place-attributes/save.php
```

### Фото объявлений

```txt
/place-images/upload.php
/place-images/delete.php
/place-images/set-cover.php
/place-images/reorder.php
```

### Избранное

```txt
/favorites/index.php
/favorites/toggle.php
/favorites/check.php
```

### Маршруты

```txt
/routes/index.php
/routes/create.php
/routes/show.php
/routes/update.php
/routes/delete.php
/routes/add-place.php
/routes/remove-place.php
/routes/reorder.php
/routes/share.php
```

## Endpoint-ы, которые есть в backend, но ещё требуют frontend-интеграции

```txt
/conversations/index.php
/conversations/start.php
/messages/index.php
/messages/send.php
/reviews/index.php
/reviews/create.php
/reviews/my.php
/reports/create.php
/reports/my.php
/notifications/index.php
/notifications/read.php
/notifications/read-all.php
/reference-values/index.php
/plans/index.php
```

## Важное расхождение по статусам

В пользовательской части есть статусы:

```txt
pending
published
rejected
archived
```

В `my-places/delete.php` backend-документа объект при удалении переводится в статус:

```txt
expired
```

Frontend-архив сейчас фильтрует `expired`, поэтому текущая логика работает. Но для единого словаря статусов лучше позже выбрать один вариант: `archived` или `expired`.

## Важное замечание по категориям

В backend код недвижимости хранится как:

```txt
real_estate
```

Во frontend часть визуальных классов и старых изображений использует формат:

```txt
real-estate
```

Сейчас это не ломает сборку. Но при дальнейшей доработке фильтров и карточек лучше привести формат к одному виду или держать явную нормализацию в API-мапперах.
