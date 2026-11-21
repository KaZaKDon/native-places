<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->query("
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
            l.region AS locality_region,
            l.district AS locality_district,

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
        WHERE p.status = 'published'
        AND (p.expires_at IS NULL OR p.expires_at >= NOW())
        AND (p.payment_status IS NULL OR p.payment_status IN ('not_required', 'paid'))
        AND c.is_active = 1
        AND pt.is_active = 1
        ORDER BY p.published_at DESC, p.created_at DESC, p.id DESC
        LIMIT 6
    ");

    successResponse([
        'places' => $stmt->fetchAll(),
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить рекомендуемые объекты', 500, [
        'error' => $e->getMessage(),
    ]);
}
