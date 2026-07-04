# Native Places — структура frontend

## Технологии

- React;
- Vite;
- React Router;
- Leaflet;
- ESLint.

## Основные папки

```txt
src/app              роутинг приложения
src/pages            страницы сайта
src/widgets          крупные UI-блоки
src/features         функциональные блоки
src/entities         вспомогательные сущности
src/shared/api       API-клиенты
src/shared/auth      авторизация и защита маршрутов
src/shared/map       утилиты карты
src/shared/search    поиск и debounce
src/shared/storage   временные/localStorage-модули, которые ещё используются
src/styles           глобальные стили и переменные
public/images        статические изображения
```

## Основные страницы

```txt
/                    HomePage
/map                 MapPage
/categories          CategoriesPage
/place/:slug         PlacePage
/submit              SubmitLocationPage / SubmitPage
/account             AccountPage
/routes/:routeId     RoutePage
/shared-route/:token SharedRoutePage
/auth                AuthPage
*                    NotFoundPage
```

## API-клиенты

```txt
src/shared/api/apiClient.js
src/shared/api/authApi.js
src/shared/api/favoritesApi.js
src/shared/api/mediaUrl.js
src/shared/api/myPlacesApi.js
src/shared/api/placesApi.js
src/shared/api/profileApi.js
src/shared/api/routesApi.js
src/shared/api/submitOptionsApi.js
```

## Удалённые неиспользуемые frontend-файлы

После проверки импортов удалены старые demo/localStorage-файлы, которые больше не подключались к приложению:

```txt
src/data/map/places.js
src/data/submit/categoryFields.js
src/entities/place/lib/getPlaceBySlug.js
src/shared/storage/accountProfileStorage.js
src/shared/storage/favoritesStorage.js
src/shared/storage/localPlacesStorage.js
```

После удаления сборка и lint повторно проходят.
