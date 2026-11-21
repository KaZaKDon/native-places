<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

$slug = trim($_GET['slug'] ?? '');

if ($slug === '') {
    errorResponse('Не передан slug объекта', 400);
}

if (!preg_match('/^[a-z0-9_-]+$/', $slug)) {
    errorResponse('Некорректный slug объекта', 422);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            p.id,
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
            p.booking_type,
            p.booking_url,
            p.created_at,
            p.updated_at,

            p.locality_id,
            l.title AS locality_title,
            l.slug AS locality_slug,
            COALESCE(r.title, l.region) AS locality_region,
            COALESCE(d.title, l.district) AS locality_district,

            c.code AS category_code,
            c.title AS category_title,
            c.icon AS category_icon,
            c.color AS category_color,

            pt.code AS type_code,
            pt.title AS type_title

        FROM places p
        INNER JOIN categories c ON c.id = p.category_id
        INNER JOIN place_types pt ON pt.id = p.place_type_id
        LEFT JOIN localities l ON l.id = p.locality_id
        LEFT JOIN regions r ON r.id = l.region_id
        LEFT JOIN districts d ON d.id = l.district_id
        WHERE p.slug = :slug
        AND p.status = 'published'
        AND (p.expires_at IS NULL OR p.expires_at >= NOW())
        AND (p.payment_status IS NULL OR p.payment_status IN ('not_required', 'paid'))
        AND c.is_active = 1
        AND pt.is_active = 1
        LIMIT 1
    ");

    $stmt->execute([
        'slug' => $slug,
    ]);

    $place = $stmt->fetch();

    if (!$place) {
        errorResponse('Объект не найден', 404);
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
        'place_id' => $place['id'],
    ]);

    $attributesStmt = $pdo->prepare("
        SELECT
            ad.id AS attribute_definition_id,
            ad.code,
            ad.title,
            ad.field_type,
            ad.sort_order,
            pa.value
        FROM place_attributes pa
        INNER JOIN attribute_definitions ad ON ad.id = pa.attribute_definition_id
        WHERE pa.place_id = :place_id
        AND ad.is_active = 1
        AND pa.value IS NOT NULL
        AND pa.value != ''
        ORDER BY ad.sort_order ASC, ad.id ASC
    ");

    $attributesStmt->execute([
        'place_id' => $place['id'],
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
