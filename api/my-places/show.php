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
            COALESCE(ppd.address, p.address) AS address,
            COALESCE(ppd.latitude, p.latitude) AS latitude,
            COALESCE(ppd.longitude, p.longitude) AS longitude,
            COALESCE(ppd.contact_name, p.contact_name) AS contact_name,
            COALESCE(ppd.phone, p.phone) AS phone,
            COALESCE(ppd.telegram, p.telegram) AS telegram,
            COALESCE(ppd.email, p.email) AS email,
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

            COALESCE(pps.show_contact_name, 0) AS show_contact_name,
            COALESCE(pps.show_phone, 0) AS show_phone,
            COALESCE(pps.show_email, 0) AS show_email,
            COALESCE(pps.show_telegram, 0) AS show_telegram,
            COALESCE(pps.show_address, 0) AS show_address,
            COALESCE(pps.show_coordinates, 1) AS show_coordinates,

            l.title AS locality_title,
            l.slug AS locality_slug,
            COALESCE(r.title, l.region) AS locality_region,
            COALESCE(d.title, l.district) AS locality_district,

            c.code AS category_code,
            c.title AS category_title,

            pt.code AS type_code,
            pt.title AS type_title

        FROM places p
        LEFT JOIN place_private_data ppd ON ppd.place_id = p.id
        LEFT JOIN place_publication_settings pps ON pps.place_id = p.id
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
