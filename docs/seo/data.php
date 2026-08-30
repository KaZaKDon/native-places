<?php

declare(strict_types=1);

function seoPublishedPlaceWhere(): string
{
    return "
        p.status = 'published'
        AND (p.expires_at IS NULL OR p.expires_at >= NOW())
        AND (p.payment_status IS NULL OR p.payment_status IN ('not_required', 'paid'))
        AND c.is_active = 1
        AND pt.is_active = 1
    ";
}

function seoGetPublishedPlace(PDO $pdo, string $slug): ?array
{
    $publishedWhere = seoPublishedPlaceWhere();
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
            p.created_at,
            p.updated_at,
            c.code AS category_code,
            c.title AS category_title,
            pt.title AS type_title,
            l.title AS locality_title,
            r.title AS region_title,
            d.title AS district_title,
            COALESCE(
                p.cover_image,
                (
                    SELECT pi.image_path
                    FROM place_images AS pi
                    WHERE pi.place_id = p.id
                    ORDER BY pi.is_cover DESC, pi.sort_order ASC, pi.id ASC
                    LIMIT 1
                )
            ) AS seo_image
        FROM places AS p
        INNER JOIN categories AS c ON c.id = p.category_id
        INNER JOIN place_types AS pt ON pt.id = p.place_type_id
        LEFT JOIN localities AS l ON l.id = p.locality_id
        LEFT JOIN regions AS r ON r.id = l.region_id
        LEFT JOIN districts AS d ON d.id = l.district_id
        WHERE p.slug = :slug
        AND {$publishedWhere}
        LIMIT 1
    ");
    $stmt->execute(['slug' => $slug]);
    $place = $stmt->fetch(PDO::FETCH_ASSOC);

    return $place ?: null;
}

function seoGetCategoryPlaces(PDO $pdo, string $databaseCode, int $limit = 24): array
{
    $publishedWhere = seoPublishedPlaceWhere();
    $safeLimit = max(1, min(100, $limit));
    $stmt = $pdo->prepare("
        SELECT
            p.title,
            p.slug,
            p.short_description,
            l.title AS locality_title
        FROM places AS p
        INNER JOIN categories AS c ON c.id = p.category_id
        INNER JOIN place_types AS pt ON pt.id = p.place_type_id
        LEFT JOIN localities AS l ON l.id = p.locality_id
        WHERE c.code = :category_code
        AND {$publishedWhere}
        ORDER BY p.updated_at DESC, p.id DESC
        LIMIT {$safeLimit}
    ");
    $stmt->execute(['category_code' => $databaseCode]);

    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

function seoGetPublishedPlacesForSitemap(PDO $pdo, int $limit = 50000): array
{
    $publishedWhere = seoPublishedPlaceWhere();
    $safeLimit = max(1, min(50000, $limit));
    $stmt = $pdo->query("
        SELECT
            p.slug,
            p.title,
            COALESCE(p.updated_at, p.created_at) AS lastmod,
            COALESCE(
                p.cover_image,
                (
                    SELECT pi.image_path
                    FROM place_images AS pi
                    WHERE pi.place_id = p.id
                    ORDER BY pi.is_cover DESC, pi.sort_order ASC, pi.id ASC
                    LIMIT 1
                )
            ) AS seo_image
        FROM places AS p
        INNER JOIN categories AS c ON c.id = p.category_id
        INNER JOIN place_types AS pt ON pt.id = p.place_type_id
        WHERE {$publishedWhere}
        AND p.slug IS NOT NULL
        AND p.slug <> ''
        ORDER BY p.updated_at DESC, p.id DESC
        LIMIT {$safeLimit}
    ");

    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}
