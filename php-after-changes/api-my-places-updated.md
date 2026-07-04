# api/my-places — исправленный PHP код

Дата: 2026-06-28

Файл собран по присланным endpoint-ам из папки `api/my-places/`:

- `create.php`
- `delete.php`
- `index.php`
- `show.php`
- `update.php`

## Что поправлено в этих версиях

- В `create.php` добавлена проверка некорректного JSON и длины названия.
- В `create.php` оставлено создание первичного объекта со статусом `pending`, `publication_type = free`, `payment_status = not_required`, потому что полная оплата должна подключаться отдельным платежным блоком.
- В `index.php` и `show.php` добавлен вывод `payment_status`, чтобы личный кабинет видел состояние оплаты.
- В `delete.php` сохранена текущая логика архива через статус `expired`, потому что эта схема уже есть в таблице `places`.
- В `update.php` добавлена проверка JSON, координат, контактов, ссылок и запрет редактирования архивного объекта.
- Все запросы оставлены совместимыми с текущей структурой таблиц `places`, `localities`, `categories`, `place_types`, `place_images`, `place_attributes`, `attribute_definitions`.

---

## `api/my-places/create.php`

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    errorResponse('Некорректный JSON', 400);
}

$title = trim($input['title'] ?? '');
$categoryId = (int) ($input['category_id'] ?? 0);
$placeTypeId = (int) ($input['place_type_id'] ?? 0);
$localityId = (int) ($input['locality_id'] ?? 0);
$planId = (int) ($input['plan_id'] ?? 0);

$errors = [];

if ($title === '') {
    $errors['title'] = 'Введите название объекта';
} elseif (mb_strlen($title) > 255) {
    $errors['title'] = 'Название объекта слишком длинное';
}

if ($categoryId <= 0) {
    $errors['category_id'] = 'Выберите категорию';
}

if ($placeTypeId <= 0) {
    $errors['place_type_id'] = 'Выберите тип объекта';
}

if ($localityId <= 0) {
    $errors['locality_id'] = 'Выберите населённый пункт';
}

if ($planId <= 0) {
    $errors['plan_id'] = 'Выберите тариф';
}

if (!empty($errors)) {
    errorResponse('Ошибка валидации', 422, [
        'errors' => $errors,
    ]);
}

try {
    $pdo = getDatabaseConnection();

    $localityStmt = $pdo->prepare("
        SELECT id
        FROM localities
        WHERE id = :id
        AND is_active = 1
        LIMIT 1
    ");

    $localityStmt->execute([
        'id' => $localityId,
    ]);

    if (!$localityStmt->fetch()) {
        errorResponse('Населённый пункт не найден или отключён', 422, [
            'errors' => [
                'locality_id' => 'Выберите населённый пункт из списка',
            ],
        ]);
    }

    $categoryStmt = $pdo->prepare("
        SELECT id
        FROM categories
        WHERE id = :id
        AND is_active = 1
        LIMIT 1
    ");

    $categoryStmt->execute([
        'id' => $categoryId,
    ]);

    if (!$categoryStmt->fetch()) {
        errorResponse('Категория не найдена или отключена', 422, [
            'errors' => [
                'category_id' => 'Выберите активную категорию',
            ],
        ]);
    }

    $typeStmt = $pdo->prepare("
        SELECT id
        FROM place_types
        WHERE id = :id
        AND category_id = :category_id
        AND is_active = 1
        LIMIT 1
    ");

    $typeStmt->execute([
        'id' => $placeTypeId,
        'category_id' => $categoryId,
    ]);

    if (!$typeStmt->fetch()) {
        errorResponse('Тип объекта не найден или не относится к выбранной категории', 422, [
            'errors' => [
                'place_type_id' => 'Выберите активный тип объекта',
            ],
        ]);
    }

    $planStmt = $pdo->prepare("
        SELECT
            id,
            code,
            title,
            max_places,
            duration_days,
            price
        FROM plans
        WHERE id = :id
        AND is_active = 1
        LIMIT 1
    ");

    $planStmt->execute([
        'id' => $planId,
    ]);

    $plan = $planStmt->fetch();

    if (!$plan) {
        errorResponse('Тариф не найден или отключён', 422, [
            'errors' => [
                'plan_id' => 'Выберите активный тариф',
            ],
        ]);
    }

    $maxPlaces = (int) ($plan['max_places'] ?? 0);

    if ($maxPlaces > 0) {
        $activePlacesStmt = $pdo->prepare("
            SELECT COUNT(*)
            FROM places
            WHERE user_id = :user_id
            AND status IN ('pending', 'published', 'rejected')
        ");

        $activePlacesStmt->execute([
            'user_id' => $userId,
        ]);

        $activePlacesCount = (int) $activePlacesStmt->fetchColumn();

        if ($activePlacesCount >= $maxPlaces) {
            errorResponse('Превышен лимит объявлений по тарифу', 422, [
                'errors' => [
                    'plan_id' => 'Выберите тариф с большим лимитом или переместите старые объявления в архив',
                ],
                'limit' => $maxPlaces,
                'used' => $activePlacesCount,
            ]);
        }
    }

    $planCode = (string) ($plan['code'] ?? '');
    $planPrice = (float) ($plan['price'] ?? 0);
    $durationDays = $plan['duration_days'] !== null ? (int) $plan['duration_days'] : 0;

    $isPrivatePlan = str_starts_with($planCode, 'private_');
    $publicationType = $isPrivatePlan && $planPrice <= 0 ? 'free' : 'paid';
    $paymentStatus = $planPrice > 0 ? 'unpaid' : 'not_required';
    $paymentRequired = $planPrice > 0;

    $subscriptionExpiresAt = null;

    if ($durationDays > 0) {
        $subscriptionExpiresAt = (new DateTimeImmutable())
            ->modify('+' . $durationDays . ' days')
            ->format('Y-m-d H:i:s');
    }

    $slug = 'place_' . bin2hex(random_bytes(8));

    $pdo->beginTransaction();

    $subscriptionId = null;

    if (!$paymentRequired) {
        $cancelSubscriptionsStmt = $pdo->prepare("
            UPDATE user_subscriptions
            SET
                status = 'cancelled',
                updated_at = NOW()
            WHERE user_id = :user_id
            AND status = 'active'
        ");

        $cancelSubscriptionsStmt->execute([
            'user_id' => $userId,
        ]);

        $subscriptionStmt = $pdo->prepare("
            INSERT INTO user_subscriptions (
                user_id,
                plan_id,
                source,
                status,
                starts_at,
                expires_at,
                created_at,
                updated_at
            ) VALUES (
                :user_id,
                :plan_id,
                :source,
                'active',
                NOW(),
                :expires_at,
                NOW(),
                NOW()
            )
        ");

        $subscriptionStmt->execute([
            'user_id' => $userId,
            'plan_id' => $planId,
            'source' => $durationDays > 0 ? 'promo' : 'free_forever',
            'expires_at' => $subscriptionExpiresAt,
        ]);

        $subscriptionId = (int) $pdo->lastInsertId();
    }

    $stmt = $pdo->prepare("
        INSERT INTO places (
            user_id,
            category_id,
            place_type_id,
            locality_id,
            title,
            slug,
            latitude,
            longitude,
            status,
            publication_type,
            payment_status,
            created_at,
            updated_at
        ) VALUES (
            :user_id,
            :category_id,
            :place_type_id,
            :locality_id,
            :title,
            :slug,
            :latitude,
            :longitude,
            'pending',
            :publication_type,
            :payment_status,
            NOW(),
            NOW()
        )
    ");

    $stmt->execute([
        'user_id' => $userId,
        'category_id' => $categoryId,
        'place_type_id' => $placeTypeId,
        'locality_id' => $localityId,
        'title' => $title,
        'slug' => $slug,
        'latitude' => 0,
        'longitude' => 0,
        'publication_type' => $publicationType,
        'payment_status' => $paymentStatus,
    ]);

    $placeId = (int) $pdo->lastInsertId();

    $paymentId = null;

    if ($paymentRequired) {
        $paymentStmt = $pdo->prepare("
            INSERT INTO payments (
                user_id,
                subscription_id,
                amount,
                currency,
                payment_provider,
                status,
                created_at,
                updated_at
            ) VALUES (
                :user_id,
                NULL,
                :amount,
                'RUB',
                'yookassa',
                'pending',
                NOW(),
                NOW()
            )
        ");

        $paymentStmt->execute([
            'user_id' => $userId,
            'amount' => $planPrice,
        ]);

        $paymentId = (int) $pdo->lastInsertId();
    }

    $pdo->commit();

    successResponse([
        'message' => $paymentRequired
            ? 'Объект создан. Требуется оплата тарифа.'
            : 'Объект успешно создан',
        'place_id' => $placeId,
        'slug' => $slug,
        'status' => 'pending',
        'publication_type' => $publicationType,
        'payment_status' => $paymentStatus,
        'payment_required' => $paymentRequired,
        'payment_id' => $paymentId,
        'subscription_id' => $subscriptionId,
        'plan' => [
            'id' => (int) $plan['id'],
            'code' => $planCode,
            'title' => $plan['title'],
            'max_places' => $maxPlaces,
            'duration_days' => $durationDays,
            'price' => $planPrice,
        ],
        'locality_id' => $localityId,
    ], 201);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось создать объект', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

---

## `api/my-places/delete.php`

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    errorResponse('Некорректный JSON', 400);
}

$placeId = (int) ($input['place_id'] ?? 0);

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

try {
    $pdo = getDatabaseConnection();

    $placeStmt = $pdo->prepare("
        SELECT
            id,
            title,
            status
        FROM places
        WHERE id = :id
        AND user_id = :user_id
        LIMIT 1
    ");

    $placeStmt->execute([
        'id' => $placeId,
        'user_id' => $userId,
    ]);

    $place = $placeStmt->fetch();

    if (!$place) {
        errorResponse('Объект не найден или нет доступа', 404);
    }

    if ($place['status'] === 'expired') {
        errorResponse('Объект уже находится в архиве', 422);
    }

    $updateStmt = $pdo->prepare("
        UPDATE places
        SET
            status = 'expired',
            moderated_at = NULL,
            updated_at = NOW()
        WHERE id = :id
        AND user_id = :user_id
        LIMIT 1
    ");

    $updateStmt->execute([
        'id' => $placeId,
        'user_id' => $userId,
    ]);

    successResponse([
        'message' => 'Объект перемещён в архив',
        'place_id' => $placeId,
        'title' => $place['title'],
        'status' => 'expired',
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось переместить объект в архив', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

---

## `api/my-places/index.php`

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            p.id,
            p.user_id,
            p.category_id,
            p.place_type_id,
            p.locality_id,
            p.title,
            p.slug,
            p.short_description,
            p.full_description,
            p.cover_image,
            p.address,
            p.latitude,
            p.longitude,
            p.contact_name,
            p.phone,
            p.telegram,
            p.email,
            p.website,
            p.booking_type,
            p.booking_url,
            p.publication_type,
            p.payment_status,
            p.is_commercial,
            p.status,
            p.moderated_at,
            p.published_at,
            p.expires_at,
            p.created_at,
            p.updated_at,

            l.title AS locality_title,
            l.slug AS locality_slug,
            COALESCE(r.title, l.region) AS locality_region,
            COALESCE(d.title, l.district) AS locality_district,

            c.code AS category_code,
            c.title AS category_title,

            pt.code AS type_code,
            pt.title AS type_title,

            (
                SELECT COUNT(*)
                FROM place_images pi
                WHERE pi.place_id = p.id
            ) AS images_count

        FROM places p
        INNER JOIN categories c ON c.id = p.category_id
        INNER JOIN place_types pt ON pt.id = p.place_type_id
        LEFT JOIN localities l ON l.id = p.locality_id
        LEFT JOIN regions r ON r.id = l.region_id
        LEFT JOIN districts d ON d.id = l.district_id
        WHERE p.user_id = :user_id
        ORDER BY
            CASE p.status
                WHEN 'pending' THEN 1
                WHEN 'published' THEN 2
                WHEN 'rejected' THEN 3
                WHEN 'expired' THEN 4
                ELSE 5
            END ASC,
            p.updated_at DESC,
            p.id DESC
    ");

    $stmt->execute([
        'user_id' => $userId,
    ]);

    successResponse([
        'places' => $stmt->fetchAll(),
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить список объектов пользователя', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

---

## `api/my-places/show.php`

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$placeId = (int) ($_GET['place_id'] ?? 0);

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

try {
    $pdo = getDatabaseConnection();

    $placeStmt = $pdo->prepare("
        SELECT
            p.id,
            p.user_id,
            p.category_id,
            p.place_type_id,
            p.locality_id,
            p.title,
            p.slug,
            p.short_description,
            p.full_description,
            p.cover_image,
            p.address,
            p.latitude,
            p.longitude,
            p.contact_name,
            p.phone,
            p.telegram,
            p.email,
            p.website,
            p.booking_type,
            p.booking_url,
            p.publication_type,
            p.payment_status,
            p.is_commercial,
            p.status,
            p.moderated_at,
            p.published_at,
            p.expires_at,
            p.created_at,
            p.updated_at,

            l.title AS locality_title,
            l.slug AS locality_slug,
            COALESCE(r.title, l.region) AS locality_region,
            COALESCE(d.title, l.district) AS locality_district,

            c.code AS category_code,
            c.title AS category_title,

            pt.code AS type_code,
            pt.title AS type_title

        FROM places p
        INNER JOIN categories c ON c.id = p.category_id
        INNER JOIN place_types pt ON pt.id = p.place_type_id
        LEFT JOIN localities l ON l.id = p.locality_id
        LEFT JOIN regions r ON r.id = l.region_id
        LEFT JOIN districts d ON d.id = l.district_id
        WHERE p.id = :id
        AND p.user_id = :user_id
        LIMIT 1
    ");

    $placeStmt->execute([
        'id' => $placeId,
        'user_id' => $userId,
    ]);

    $place = $placeStmt->fetch();

    if (!$place) {
        errorResponse('Объект не найден или нет доступа', 404);
    }

    $imagesStmt = $pdo->prepare("
        SELECT
            id,
            image_path,
            sort_order,
            is_cover
        FROM place_images
        WHERE place_id = :place_id
        ORDER BY sort_order ASC, id ASC
    ");

    $imagesStmt->execute([
        'place_id' => $placeId,
    ]);

    $attributesStmt = $pdo->prepare("
        SELECT
            pa.attribute_definition_id,
            pa.value,
            ad.code,
            ad.title,
            ad.field_type,
            ad.sort_order
        FROM place_attributes pa
        INNER JOIN attribute_definitions ad ON ad.id = pa.attribute_definition_id
        WHERE pa.place_id = :place_id
        AND ad.is_active = 1
        ORDER BY ad.sort_order ASC, ad.id ASC
    ");

    $attributesStmt->execute([
        'place_id' => $placeId,
    ]);

    successResponse([
        'place' => $place,
        'images' => $imagesStmt->fetchAll(),
        'attributes' => $attributesStmt->fetchAll(),
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить объект', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

---

## `api/my-places/update.php`

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    errorResponse('Некорректный JSON', 400);
}

$placeId = (int) ($input['id'] ?? 0);

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

$title = trim($input['title'] ?? '');
$shortDescription = trim($input['short_description'] ?? '');
$fullDescription = trim($input['full_description'] ?? '');
$address = trim($input['address'] ?? '');
$latitude = $input['latitude'] ?? null;
$longitude = $input['longitude'] ?? null;
$localityId = (int) ($input['locality_id'] ?? 0);
$contactName = trim($input['contact_name'] ?? '');
$phone = trim($input['phone'] ?? '');
$telegram = trim($input['telegram'] ?? '');
$email = trim($input['email'] ?? '');
$website = trim($input['website'] ?? '');
$bookingType = trim($input['booking_type'] ?? '');
$bookingUrl = trim($input['booking_url'] ?? '');

$errors = [];

if ($title === '') {
    $errors['title'] = 'Введите название объекта';
} elseif (mb_strlen($title) > 255) {
    $errors['title'] = 'Название объекта слишком длинное';
}

if ($localityId <= 0) {
    $errors['locality_id'] = 'Выберите населённый пункт';
}

if ($latitude === null || $latitude === '') {
    $errors['latitude'] = 'Укажите точку на карте';
} elseif (!is_numeric($latitude)) {
    $errors['latitude'] = 'Некорректная широта';
}

if ($longitude === null || $longitude === '') {
    $errors['longitude'] = 'Укажите точку на карте';
} elseif (!is_numeric($longitude)) {
    $errors['longitude'] = 'Некорректная долгота';
}

if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'Некорректный email';
}

if ($website !== '' && !filter_var($website, FILTER_VALIDATE_URL)) {
    $errors['website'] = 'Некорректный сайт';
}

if ($bookingUrl !== '' && !filter_var($bookingUrl, FILTER_VALIDATE_URL)) {
    $errors['booking_url'] = 'Некорректная ссылка для бронирования';
}

$allowedBookingTypes = [
    'chat',
    'phone',
    'external',
];

if ($bookingType !== '' && !in_array($bookingType, $allowedBookingTypes, true)) {
    $errors['booking_type'] = 'Некорректный способ бронирования';
}

if (!empty($errors)) {
    errorResponse('Ошибка валидации', 422, [
        'errors' => $errors,
    ]);
}

try {
    $pdo = getDatabaseConnection();

    $placeStmt = $pdo->prepare("
        SELECT
            id,
            status
        FROM places
        WHERE id = :id
        AND user_id = :user_id
        LIMIT 1
    ");

    $placeStmt->execute([
        'id' => $placeId,
        'user_id' => $userId,
    ]);

    $place = $placeStmt->fetch();

    if (!$place) {
        errorResponse('Объект не найден или нет доступа', 404);
    }

    if ($place['status'] === 'expired') {
        errorResponse('Снятый с публикации объект нельзя редактировать', 422);
    }

    $localityStmt = $pdo->prepare("
        SELECT id
        FROM localities
        WHERE id = :id
        AND is_active = 1
        LIMIT 1
    ");

    $localityStmt->execute([
        'id' => $localityId,
    ]);

    if (!$localityStmt->fetch()) {
        errorResponse('Населённый пункт не найден или отключён', 422, [
            'errors' => [
                'locality_id' => 'Выберите населённый пункт из списка',
            ],
        ]);
    }

    $normalizedLatitude = (float) $latitude;
    $normalizedLongitude = (float) $longitude;

    if ($normalizedLatitude < -90 || $normalizedLatitude > 90) {
        errorResponse('Некорректная широта', 422, [
            'errors' => [
                'latitude' => 'Широта должна быть от -90 до 90',
            ],
        ]);
    }

    if ($normalizedLongitude < -180 || $normalizedLongitude > 180) {
        errorResponse('Некорректная долгота', 422, [
            'errors' => [
                'longitude' => 'Долгота должна быть от -180 до 180',
            ],
        ]);
    }

    $updateStmt = $pdo->prepare("
        UPDATE places
        SET
            title = :title,
            short_description = :short_description,
            full_description = :full_description,
            address = :address,
            locality_id = :locality_id,
            latitude = :latitude,
            longitude = :longitude,
            contact_name = :contact_name,
            phone = :phone,
            telegram = :telegram,
            email = :email,
            website = :website,
            booking_type = :booking_type,
            booking_url = :booking_url,
            status = 'pending',
            moderated_at = NULL,
            updated_at = NOW()
        WHERE id = :id
        AND user_id = :user_id
        AND status != 'expired'
        LIMIT 1
    ");

    $updateStmt->execute([
        'title' => $title,
        'short_description' => $shortDescription !== '' ? $shortDescription : null,
        'full_description' => $fullDescription !== '' ? $fullDescription : null,
        'address' => $address !== '' ? $address : null,
        'locality_id' => $localityId,
        'latitude' => $normalizedLatitude,
        'longitude' => $normalizedLongitude,
        'contact_name' => $contactName !== '' ? $contactName : null,
        'phone' => $phone !== '' ? $phone : null,
        'telegram' => $telegram !== '' ? $telegram : null,
        'email' => $email !== '' ? $email : null,
        'website' => $website !== '' ? $website : null,
        'booking_type' => $bookingType !== '' ? $bookingType : null,
        'booking_url' => $bookingUrl !== '' ? $bookingUrl : null,
        'id' => $placeId,
        'user_id' => $userId,
    ]);

    successResponse([
        'message' => 'Объект успешно обновлён и отправлен на модерацию',
        'place_id' => $placeId,
        'locality_id' => $localityId,
        'status' => 'pending',
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось обновить объект', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

## Нюанс по тарифам, лимитам и Ю-Кассе

В этой версии `create.php` пока создаёт объявление как бесплатное:

```txt
publication_type = free
payment_status = not_required
status = pending
```

Так оставлено специально: `api/plans/index.php` уже есть, но папки `api/payments/` на хосте пока нет. Полная платная логика потребует создать новый платежный блок:

```txt
api/payments/create.php
api/payments/status.php
api/payments/yookassa-webhook.php
```

После получения PHP для `plans` и `payments` нужно будет изменить сценарий создания так:

```txt
1. Пользователь выбирает тариф из plans.
2. Backend проверяет plans.max_places и активные объявления пользователя.
3. Если тариф платный — создаётся платеж Ю-Кассы.
4. Объявление получает payment_status = unpaid.
5. После webhook от Ю-Кассы payment_status становится paid.
6. После модерации выставляются published_at и expires_at по duration_days.
```

---

## `api/my-places/restore.php`

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    errorResponse('Некорректный JSON', 400);
}

$placeId = (int) ($input['place_id'] ?? 0);

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

try {
    $pdo = getDatabaseConnection();

    $placeStmt = $pdo->prepare("
        SELECT
            id,
            title,
            status
        FROM places
        WHERE id = :id
        AND user_id = :user_id
        LIMIT 1
    ");

    $placeStmt->execute([
        'id' => $placeId,
        'user_id' => $userId,
    ]);

    $place = $placeStmt->fetch();

    if (!$place) {
        errorResponse('Объявление не найдено или нет доступа', 404);
    }

    if ($place['status'] !== 'expired') {
        errorResponse('Восстановить можно только объявление из архива', 422);
    }

    $subscriptionStmt = $pdo->prepare("
        SELECT
            us.id,
            p.max_places
        FROM user_subscriptions us
        INNER JOIN plans p
            ON p.id = us.plan_id
        WHERE us.user_id = :user_id
        AND us.status = 'active'
        ORDER BY us.starts_at DESC, us.id DESC
        LIMIT 1
    ");

    $subscriptionStmt->execute([
        'user_id' => $userId,
    ]);

    $subscription = $subscriptionStmt->fetch();

    if (!$subscription) {
        errorResponse('Нет активного тарифа для восстановления объявления', 422);
    }

    $maxPlaces = (int) ($subscription['max_places'] ?? 0);

    if ($maxPlaces > 0) {
        $activePlacesStmt = $pdo->prepare("
            SELECT COUNT(*)
            FROM places
            WHERE user_id = :user_id
            AND status IN ('pending', 'published', 'rejected')
        ");

        $activePlacesStmt->execute([
            'user_id' => $userId,
        ]);

        $activePlacesCount = (int) $activePlacesStmt->fetchColumn();

        if ($activePlacesCount >= $maxPlaces) {
            errorResponse('Превышен лимит объявлений по текущему тарифу', 422, [
                'errors' => [
                    'place_id' => 'Выберите тариф с большим лимитом или оставьте объявление в архиве',
                ],
                'limit' => $maxPlaces,
                'used' => $activePlacesCount,
            ]);
        }
    }

    $updateStmt = $pdo->prepare("
        UPDATE places
        SET
            status = 'pending',
            moderated_at = NULL,
            updated_at = NOW()
        WHERE id = :id
        AND user_id = :user_id
        AND status = 'expired'
        LIMIT 1
    ");

    $updateStmt->execute([
        'id' => $placeId,
        'user_id' => $userId,
    ]);

    successResponse([
        'message' => 'Объявление восстановлено и отправлено на модерацию',
        'place_id' => $placeId,
        'title' => $place['title'],
        'status' => 'pending',
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось восстановить объявление', 500, [
        'error' => $e->getMessage(),
    ]);
}
```

---

## `api/my-places/remove.php`

```php
<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    errorResponse('Некорректный JSON', 400);
}

$placeId = (int) ($input['place_id'] ?? 0);

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

try {
    $pdo = getDatabaseConnection();

    $placeStmt = $pdo->prepare("
        SELECT
            id,
            title,
            status
        FROM places
        WHERE id = :id
        AND user_id = :user_id
        LIMIT 1
    ");

    $placeStmt->execute([
        'id' => $placeId,
        'user_id' => $userId,
    ]);

    $place = $placeStmt->fetch();

    if (!$place) {
        errorResponse('Объявление не найдено или нет доступа', 404);
    }

    if ($place['status'] !== 'expired') {
        errorResponse('Удалить навсегда можно только объявление из архива', 422);
    }

    $pdo->beginTransaction();

    $pdo->prepare("DELETE FROM favorites WHERE place_id = :place_id")->execute([
        'place_id' => $placeId,
    ]);

    $pdo->prepare("DELETE FROM place_attributes WHERE place_id = :place_id")->execute([
        'place_id' => $placeId,
    ]);

    $pdo->prepare("DELETE FROM place_images WHERE place_id = :place_id")->execute([
        'place_id' => $placeId,
    ]);

    $deleteStmt = $pdo->prepare("
        DELETE FROM places
        WHERE id = :id
        AND user_id = :user_id
        AND status = 'expired'
        LIMIT 1
    ");

    $deleteStmt->execute([
        'id' => $placeId,
        'user_id' => $userId,
    ]);

    $pdo->commit();

    successResponse([
        'message' => 'Объявление удалено из архива',
        'place_id' => $placeId,
        'title' => $place['title'],
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось удалить объявление из архива', 500, [
        'error' => $e->getMessage(),
    ]);
}
```
