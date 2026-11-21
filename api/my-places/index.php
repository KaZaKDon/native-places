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
            pt.title AS type_title,

            (
                SELECT COUNT(*)
                FROM place_images pi
                WHERE pi.place_id = p.id
            ) AS images_count

        FROM places p
        LEFT JOIN place_private_data ppd ON ppd.place_id = p.id
        LEFT JOIN place_publication_settings pps ON pps.place_id = p.id
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
