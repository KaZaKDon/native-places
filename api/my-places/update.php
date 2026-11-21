<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../shared/legal.php';
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

$title = trim((string) ($input['title'] ?? ''));
$shortDescription = trim((string) ($input['short_description'] ?? ''));
$fullDescription = trim((string) ($input['full_description'] ?? ''));
$address = trim((string) ($input['address'] ?? ''));
$latitude = $input['latitude'] ?? null;
$longitude = $input['longitude'] ?? null;
$localityId = (int) ($input['locality_id'] ?? 0);
$contactName = trim((string) ($input['contact_name'] ?? ''));
$phone = trim((string) ($input['phone'] ?? ''));
$telegram = trim((string) ($input['telegram'] ?? ''));
$email = trim((string) ($input['email'] ?? ''));
$website = trim((string) ($input['website'] ?? ''));
$bookingType = trim((string) ($input['booking_type'] ?? ''));
$bookingUrl = trim((string) ($input['booking_url'] ?? ''));
$publicationSettingsInput = $input['publication_settings'] ?? null;
$legalAcceptanceInput = $input['legal_acceptance'] ?? null;

$errors = [];

if ($title === '') {
    $errors['title'] = 'Введите название объекта';
} elseif (mb_strlen($title) > 255) {
    $errors['title'] = 'Название объекта слишком длинное';
}

if ($localityId <= 0) {
    $errors['locality_id'] = 'Выберите населённый пункт';
}

if ($latitude === null || $latitude === '' || !is_numeric($latitude)) {
    $errors['latitude'] = 'Укажите корректную точку на карте';
}

if ($longitude === null || $longitude === '' || !is_numeric($longitude)) {
    $errors['longitude'] = 'Укажите корректную точку на карте';
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

if ($bookingType !== '' && !in_array($bookingType, ['chat', 'phone', 'external'], true)) {
    $errors['booking_type'] = 'Некорректный способ бронирования';
}

if (!is_array($publicationSettingsInput)) {
    $errors['publication_settings'] = 'Выберите данные, разрешённые для публикации';
}

if (!is_array($legalAcceptanceInput)) {
    $errors['legal_acceptance'] = 'Подтвердите ознакомление с документами';
}

if (!empty($errors)) {
    errorResponse('Ошибка валидации', 422, ['errors' => $errors]);
}

$publicationSettings = [
    'contact_name' => !empty($publicationSettingsInput['contact_name']),
    'phone' => !empty($publicationSettingsInput['phone']),
    'email' => !empty($publicationSettingsInput['email']),
    'telegram' => !empty($publicationSettingsInput['telegram']),
    'address' => !empty($publicationSettingsInput['address']),
    'coordinates' => !empty($publicationSettingsInput['coordinates']),
];

try {
    $acceptedDocuments = validateLegalAcceptancePayload(
        $legalAcceptanceInput,
        ['publication_data_consent', 'content_rules']
    );

    $normalizedLatitude = (float) $latitude;
    $normalizedLongitude = (float) $longitude;

    if ($normalizedLatitude < -90 || $normalizedLatitude > 90) {
        errorResponse('Некорректная широта', 422);
    }

    if ($normalizedLongitude < -180 || $normalizedLongitude > 180) {
        errorResponse('Некорректная долгота', 422);
    }

    $pdo = getDatabaseConnection();
    $pdo->beginTransaction();

    $placeStmt = $pdo->prepare("
        SELECT
            p.id,
            p.status,
            EXISTS(
                SELECT 1
                FROM place_publication_settings pps
                WHERE pps.place_id = p.id
            ) AS has_publication_settings
        FROM places p
        WHERE p.id = :id AND p.user_id = :user_id
        LIMIT 1
        FOR UPDATE
    ");
    $placeStmt->execute(['id' => $placeId, 'user_id' => $userId]);
    $place = $placeStmt->fetch();

    if (!$place) {
        $pdo->rollBack();
        errorResponse('Объект не найден или нет доступа', 404);
    }

    if ($place['status'] === 'expired') {
        $pdo->rollBack();
        errorResponse('Снятый с публикации объект нельзя редактировать', 422);
    }

    $localityStmt = $pdo->prepare("
        SELECT id FROM localities
        WHERE id = :id AND is_active = 1
        LIMIT 1
    ");
    $localityStmt->execute(['id' => $localityId]);

    if (!$localityStmt->fetch()) {
        $pdo->rollBack();
        errorResponse('Населённый пункт не найден или отключён', 422);
    }

    $privateStmt = $pdo->prepare("
        INSERT INTO place_private_data (
            place_id, address, latitude, longitude,
            contact_name, phone, email, telegram,
            created_at, updated_at
        ) VALUES (
            :place_id, :address, :latitude, :longitude,
            :contact_name, :phone, :email, :telegram,
            NOW(), NOW()
        )
        ON DUPLICATE KEY UPDATE
            address = VALUES(address),
            latitude = VALUES(latitude),
            longitude = VALUES(longitude),
            contact_name = VALUES(contact_name),
            phone = VALUES(phone),
            email = VALUES(email),
            telegram = VALUES(telegram),
            updated_at = NOW()
    ");
    $privateStmt->execute([
        'place_id' => $placeId,
        'address' => $address !== '' ? $address : null,
        'latitude' => $normalizedLatitude,
        'longitude' => $normalizedLongitude,
        'contact_name' => $contactName !== '' ? $contactName : null,
        'phone' => $phone !== '' ? $phone : null,
        'email' => $email !== '' ? $email : null,
        'telegram' => $telegram !== '' ? $telegram : null,
    ]);

    $settingsStmt = $pdo->prepare("
        INSERT INTO place_publication_settings (
            place_id, show_contact_name, show_phone, show_email,
            show_telegram, show_address, show_coordinates,
            created_at, updated_at
        ) VALUES (
            :place_id, :show_contact_name, :show_phone, :show_email,
            :show_telegram, :show_address, :show_coordinates,
            NOW(), NOW()
        )
        ON DUPLICATE KEY UPDATE
            show_contact_name = VALUES(show_contact_name),
            show_phone = VALUES(show_phone),
            show_email = VALUES(show_email),
            show_telegram = VALUES(show_telegram),
            show_address = VALUES(show_address),
            show_coordinates = VALUES(show_coordinates),
            updated_at = NOW()
    ");
    $settingsStmt->execute([
        'place_id' => $placeId,
        'show_contact_name' => (int) $publicationSettings['contact_name'],
        'show_phone' => (int) $publicationSettings['phone'],
        'show_email' => (int) $publicationSettings['email'],
        'show_telegram' => (int) $publicationSettings['telegram'],
        'show_address' => (int) $publicationSettings['address'],
        'show_coordinates' => (int) $publicationSettings['coordinates'],
    ]);

    $updateStmt = $pdo->prepare("
        UPDATE places
        SET
            title = :title,
            short_description = :short_description,
            full_description = :full_description,
            address = :public_address,
            locality_id = :locality_id,
            latitude = :public_latitude,
            longitude = :public_longitude,
            contact_name = :public_contact_name,
            phone = :public_phone,
            telegram = :public_telegram,
            email = :public_email,
            website = :website,
            booking_type = :booking_type,
            booking_url = :booking_url,
            status = 'pending',
            moderated_at = NULL,
            updated_at = NOW()
        WHERE id = :id AND user_id = :user_id AND status != 'expired'
        LIMIT 1
    ");
    $updateStmt->execute([
        'title' => $title,
        'short_description' => $shortDescription !== '' ? $shortDescription : null,
        'full_description' => $fullDescription !== '' ? $fullDescription : null,
        'public_address' => $publicationSettings['address'] && $address !== '' ? $address : null,
        'locality_id' => $localityId,
        'public_latitude' => $publicationSettings['coordinates'] ? $normalizedLatitude : 0,
        'public_longitude' => $publicationSettings['coordinates'] ? $normalizedLongitude : 0,
        'public_contact_name' => $publicationSettings['contact_name'] && $contactName !== '' ? $contactName : null,
        'public_phone' => $publicationSettings['phone'] && $phone !== '' ? $phone : null,
        'public_telegram' => $publicationSettings['telegram'] && $telegram !== '' ? $telegram : null,
        'public_email' => $publicationSettings['email'] && $email !== '' ? $email : null,
        'website' => $website !== '' ? $website : null,
        'booking_type' => $bookingType !== '' ? $bookingType : null,
        'booking_url' => $bookingUrl !== '' ? $bookingUrl : null,
        'id' => $placeId,
        'user_id' => $userId,
    ]);

    recordUserLegalAcceptances(
        $pdo,
        $userId,
        $acceptedDocuments,
        'listing',
        !empty($place['has_publication_settings']) ? 'updated' : 'accepted',
        'place',
        $placeId,
        ['publication_settings' => $publicationSettings]
    );

    $pdo->commit();

    successResponse([
        'message' => 'Объект успешно обновлён и отправлен на модерацию',
        'place_id' => $placeId,
        'locality_id' => $localityId,
        'status' => 'pending',
        'publication_settings' => $publicationSettings,
    ]);
} catch (InvalidArgumentException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    errorResponse($e->getMessage(), 422);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    errorResponse('Не удалось обновить объект', 500, ['error' => $e->getMessage()]);
}
