<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdminOrModerator();

$placeId = (int) ($_GET['id'] ?? 0);

if ($placeId <= 0) {
    errorResponse('Не передан ID объявления', 422);
}

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
            p.status,
            p.publication_type,
            p.payment_status,
            p.is_commercial,
            p.published_at,
            p.expires_at,
            p.closed_at,
            p.moderated_at,
            p.booking_type,
            p.booking_url,
            p.created_at,
            p.updated_at,

            u.email AS owner_email,
            u.first_name AS owner_first_name,
            u.last_name AS owner_last_name,
            u.phone AS owner_phone,
            u.telegram AS owner_telegram,

            c.code AS category_code,
            c.title AS category_title,

            pt.code AS type_code,
            pt.title AS type_title
        FROM places p
        INNER JOIN users u
            ON u.id = p.user_id
        INNER JOIN categories c
            ON c.id = p.category_id
        INNER JOIN place_types pt
            ON pt.id = p.place_type_id
        WHERE p.id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $placeId,
    ]);

    $place = $stmt->fetch();

    if (!$place) {
        errorResponse('Объявление не найдено', 404);
    }

    $imagesStmt = $pdo->prepare("
        SELECT
            id,
            image_path,
            sort_order,
            is_cover,
            created_at
        FROM place_images
        WHERE place_id = :place_id
        ORDER BY sort_order ASC, id ASC
    ");

    $imagesStmt->execute([
        'place_id' => $placeId,
    ]);

    $attributesStmt = $pdo->prepare("
        SELECT
            pa.id,
            pa.place_id,
            pa.attribute_definition_id,
            pa.value,
            ad.code,
            ad.title,
            ad.field_type,
            ad.sort_order
        FROM place_attributes pa
        INNER JOIN attribute_definitions ad
            ON ad.id = pa.attribute_definition_id
        WHERE pa.place_id = :place_id
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
    errorResponse('Не удалось получить объявление', 500, [
        'error' => $e->getMessage(),
    ]);
}
