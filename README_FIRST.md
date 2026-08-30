# Native Places — исправление подтверждения email, шаг 4

Дата подготовки: 10 августа 2026 года.

Пакет устраняет два подтверждённых дефекта:

1. Email больше не подтверждается автоматически при загрузке `/verify-email?token=...`. Пользователь должен нажать кнопку `Подтвердить email`, поэтому почтовый сканер не сможет активировать аккаунт простым открытием ссылки.
2. Повторная отправка письма учитывает серверный cooldown. Кнопка показывает обратный отсчёт, блокируется на время ожидания и корректно обрабатывает HTTP `429`.

## Порядок замены

### 1. Backend на хосте

Сделать резервные копии и заменить три файла:

```text
/www/native-places.ru/api/shared/email-verification.php
/www/native-places.ru/api/auth/register.php
/www/native-places.ru/api/auth/resend-verification.php
```

Файлы для хоста лежат внутри пакета по тем же путям в каталоге `host`.

После замены проверить синтаксис:

```bash
php -l /www/native-places.ru/api/shared/email-verification.php
php -l /www/native-places.ru/api/auth/register.php
php -l /www/native-places.ru/api/auth/resend-verification.php
```

Ожидаемый результат для каждого файла: `No syntax errors detected`.

### 2. Frontend

Заменить полными версиями:

```text
src/pages/AuthPage.jsx
src/pages/VerifyEmailPage.jsx
src/pages/VerifyEmailPage.css
```

Затем выполнить:

```bash
npm run lint
npm test
npm run build
```

Если на сайте размещается собранный frontend, после успешной сборки загрузить обновлённое содержимое `dist` обычным способом проекта.

### 3. Документация

Заменить:

```text
docs/backend/shared/email-verification.php.md
docs/backend/auth/register.php.md
docs/backend/auth/resend-verification.php.md
```

## Что изменилось в API

Успешные ответы регистрации и повторной отправки получили поле:

```json
{
  "resend_available_in_seconds": 60
}
```

Значение берётся из `EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS`, поэтому frontend не хранит собственную копию серверной настройки.

Ответ `429` по-прежнему содержит точное оставшееся время:

```json
{
  "extra": {
    "retry_after_seconds": 42
  }
}
```

## Контрольный тест

1. Зарегистрировать новый тестовый аккаунт с доступным email.
2. Убедиться, что кнопка повторной отправки сразу показывает обратный отсчёт.
3. Открыть ссылку из письма и до нажатия кнопки проверить: страница только предлагает подтвердить email.
4. Нажать `Подтвердить email` и получить сообщение об успешном подтверждении.
5. Войти в аккаунт.
6. Для проверки `429` до подтверждения email перезагрузить страницу, попытаться войти и нажать повторную отправку раньше разрешённого срока. Интерфейс должен показать оставшееся время и заблокировать кнопку.

Изменения схемы БД для этого шага не требуются.
