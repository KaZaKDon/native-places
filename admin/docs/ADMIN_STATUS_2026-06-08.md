# Native Places Admin

## Проект

Административная панель проекта Native Places.

Frontend: React + Vite

Назначение:

* модерация объявлений;
* работа с пользователями;
* обработка жалоб;
* модерация отзывов;
* контроль платежей;
* управление справочниками и настройками проекта.

---

## Структура проекта

```text
src/

app/
├─ App.jsx
├─ router

layouts/
├─ AdminLayout.jsx

config/
├─ navigation.js
├─ auth.js

components/
├─ Sidebar/
├─ Topbar/
├─ StatusBadge/
├─ BackButton/
├─ PageStub.jsx

pages/

Dashboard/

Places/
├─ PlacesPage.jsx
├─ components/
├─ data/

Place/
├─ PlacePage.jsx

Users/
├─ UsersPage.jsx
├─ UserPage.jsx
├─ components/
├─ data/

Reports/
├─ ReportsPage.jsx
├─ components/
├─ data/

Report/
├─ ReportPage.jsx

Reviews/
├─ ReviewsPage.jsx
├─ components/
├─ data/

Review/
├─ ReviewPage.jsx

Payments/
├─ PaymentsPage.jsx
├─ components/
├─ data/

Payment/
├─ PaymentPage.jsx
```

---

## Роли

Используется временная заглушка.

Файл:

```text
src/config/auth.js
```

```js
export const CURRENT_USER = {
  id: 1,
  role: "admin",
};
```

Доступные роли:

```text
admin
moderator
```

---

## Меню

Файл:

```text
src/config/navigation.js
```

Навигация уже поддерживает роли.

## Admin

```text
Главная
Объявления
Пользователи
Жалобы
Отзывы

Категории
Типы объектов
Характеристики
Справочники

Тарифы
Платежи
Рассылки

Статистика
Логи модераторов
Настройки
```

## Moderator

```text
Главная
Объявления
Пользователи
Жалобы
Отзывы

Характеристики
Справочники
Рассылки

Статистика
```

---

## Реализовано

## Dashboard

Готова главная панель.

---

## Places

### PlacesPage

Реализовано:

```text
таблица объявлений
статусы
фильтрация
переход в карточку объявления
```

### PlacePage

Реализовано:

```text
информация об объявлении
размещение
история
модерация
переход к владельцу
кнопка назад
```

---

## Users

### UsersPage

Реализовано:

```text
таблица пользователей
фильтрация по статусам
переход в карточку пользователя
```

### UserPage

Реализовано:

```text
основная информация
объявления пользователя
история пользователя
статистика
управление пользователем
кнопка назад
```

Особенность:

```text
управление пользователем доступно только admin
```

---

## Reports

### ReportsPage

Реализовано:

```text
таблица жалоб
статусы
фильтрация
переходы
```

### ReportPage

Реализовано:

```text
описание жалобы
связанный пользователь
связанное объявление
информация
решение модератора
кнопка назад
```

---

## Reviews

### ReviewsPage

Реализовано:

```text
таблица отзывов
оценка
статусы
фильтрация
переходы
```

### ReviewPage

Реализовано:

```text
текст отзыва
информация
связанные данные
модерация
кнопка назад
```

Принято решение:

```text
Отзывы публикуются сразу.
Используется постмодерация.
```

---

## Payments

### PaymentsPage

Реализовано:

```text
таблица платежей
статусы
фильтрация
переходы
```

### PaymentPage

Реализовано:

```text
информация о платеже
пользователь
объявление
подтверждение оплаты
отклонение оплаты
кнопка назад
```

Принято решение:

```text
На старте проекта используется ручное подтверждение оплаты.

Пользователь создаёт заявку.
Администратор проверяет поступление средств.
После проверки подтверждает оплату.
```

---

## Общие компоненты

## BackButton

Файл:

```text
src/components/BackButton/
```

Используется:

```text
PlacePage
UserPage
ReportPage
ReviewPage
PaymentPage
```

Логика:

```js
navigate(-1)
```

---

## StatusBadge

Файл:

```text
src/components/StatusBadge/
```

Поддерживаемые статусы:

```text
pending
published
rejected
expired

active
blocked

paid
waiting
failed

new
processing
resolved
```

---

## Backend интеграция

Текущая админка работает на demoData.

После подключения API заменить demoData на запросы.

Основные будущие разделы API:

```text
/api/admin/places/*
/api/admin/users/*
/api/admin/reports/*
/api/admin/reviews/*
/api/admin/payments/*
```

---

## Текущее состояние проекта

Готовность интерфейса:

```text
Модераторская часть ≈ 80%

Администраторская часть ≈ 50%

Интеграция API ≈ 0%
```
