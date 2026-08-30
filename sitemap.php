<?php

declare(strict_types=1);

require_once __DIR__ . '/seo/config.php';
require_once __DIR__ . '/seo/helpers.php';
require_once __DIR__ . '/seo/data.php';
require_once __DIR__ . '/api/config/database.php';

function sitemapDate(?string $value): string
{
    if (!$value) {
        return SEO_RELEASE_DATE;
    }

    try {
        return (new DateTimeImmutable($value))->format('Y-m-d');
    } catch (Throwable $e) {
        return SEO_RELEASE_DATE;
    }
}

function sitemapPrintUrl(array $item): void
{
    echo "  <url>\n";
    echo '    <loc>' . seoXmlEscape($item['loc']) . "</loc>\n";
    echo '    <lastmod>' . seoXmlEscape($item['lastmod']) . "</lastmod>\n";
    echo '    <changefreq>' . seoXmlEscape($item['changefreq']) . "</changefreq>\n";
    echo '    <priority>' . seoXmlEscape($item['priority']) . "</priority>\n";

    if (!empty($item['image'])) {
        echo "    <image:image>\n";
        echo '      <image:loc>' . seoXmlEscape($item['image']) . "</image:loc>\n";

        if (!empty($item['image_title'])) {
            echo '      <image:title>' . seoXmlEscape($item['image_title']) . "</image:title>\n";
        }

        echo "    </image:image>\n";
    }

    echo "  </url>\n";
}

$items = [];

foreach (SEO_STATIC_PAGES as $path => $page) {
    $items[] = [
        'loc' => seoAbsoluteUrl($path),
        'lastmod' => SEO_RELEASE_DATE,
        'changefreq' => $page['changefreq'],
        'priority' => $page['priority'],
        'image' => $path === '/' ? seoAbsoluteUrl(SEO_DEFAULT_IMAGE) : null,
        'image_title' => $path === '/' ? SEO_SITE_NAME : null,
    ];
}

foreach (SEO_CATEGORY_PAGES as $slug => $category) {
    $items[] = [
        'loc' => SEO_SITE_URL . '/category/' . $slug,
        'lastmod' => SEO_RELEASE_DATE,
        'changefreq' => 'weekly',
        'priority' => '0.7',
        'image' => seoNormalizeMediaUrl($category['image']),
        'image_title' => $category['name'],
    ];
}

try {
    $places = seoGetPublishedPlacesForSitemap(getDatabaseConnection());
} catch (Throwable $e) {
    error_log('[server-seo/sitemap] ' . $e->getMessage());
    http_response_code(503);
    header('Content-Type: text/plain; charset=utf-8');
    header('Cache-Control: no-store');
    header('Retry-After: 300');
    echo 'Sitemap temporarily unavailable';
    exit;
}

foreach ($places as $place) {
    $items[] = [
        'loc' => SEO_SITE_URL . '/place/' . rawurlencode((string) $place['slug']),
        'lastmod' => sitemapDate($place['lastmod'] ?? null),
        'changefreq' => 'weekly',
        'priority' => '0.6',
        'image' => !empty($place['seo_image'])
            ? seoNormalizeMediaUrl($place['seo_image'])
            : null,
        'image_title' => $place['title'] ?? null,
    ];
}

header('Content-Type: application/xml; charset=utf-8');
header('Cache-Control: public, max-age=300, stale-while-revalidate=60');
header('X-Robots-Tag: noindex, follow');

echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
    . 'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">' . "\n";

foreach ($items as $item) {
    sitemapPrintUrl($item);
}

echo "</urlset>\n";

