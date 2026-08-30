<?php

declare(strict_types=1);

function seoHtmlEscape(?string $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function seoXmlEscape(?string $value): string
{
    return htmlspecialchars((string) $value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
}

function seoNormalizeText(?string $value, string $fallback = ''): string
{
    $text = trim(preg_replace('/\s+/u', ' ', strip_tags((string) $value)) ?? '');

    return $text !== '' ? $text : $fallback;
}

function seoTruncateText(?string $value, int $maxLength, string $fallback = ''): string
{
    $text = seoNormalizeText($value, $fallback);

    if (mb_strlen($text, 'UTF-8') <= $maxLength) {
        return $text;
    }

    $short = mb_substr($text, 0, $maxLength - 1, 'UTF-8');
    $spacePosition = mb_strrpos($short, ' ', 0, 'UTF-8');

    if ($spacePosition !== false && $spacePosition > (int) ($maxLength * 0.65)) {
        $short = mb_substr($short, 0, $spacePosition, 'UTF-8');
    }

    return rtrim($short) . '…';
}

function seoAbsoluteUrl(string $value): string
{
    if (preg_match('#^https?://#i', $value)) {
        return $value;
    }

    return SEO_SITE_URL . '/' . ltrim($value, '/');
}

function seoNormalizeMediaUrl(?string $value): string
{
    $path = trim((string) $value);

    return $path !== '' ? seoAbsoluteUrl($path) : seoAbsoluteUrl(SEO_DEFAULT_IMAGE);
}

function seoJsonEncode(array $value): string
{
    $json = json_encode(
        $value,
        JSON_UNESCAPED_UNICODE
        | JSON_UNESCAPED_SLASHES
        | JSON_HEX_TAG
        | JSON_HEX_AMP
        | JSON_HEX_APOS
        | JSON_HEX_QUOT
    );

    if ($json === false) {
        throw new RuntimeException('Не удалось сформировать JSON-LD');
    }

    return $json;
}

function seoBreadcrumbs(array $items): array
{
    return [
        '@context' => 'https://schema.org',
        '@type' => 'BreadcrumbList',
        'itemListElement' => array_map(
            static fn(array $item, int $index): array => [
                '@type' => 'ListItem',
                'position' => $index + 1,
                'name' => $item['name'],
                'item' => seoAbsoluteUrl($item['path']),
            ],
            $items,
            array_keys($items)
        ),
    ];
}

function seoSnapshotStyles(): string
{
    return <<<'HTML'
<style id="server-seo-snapshot-style">
    .server-seo-snapshot{min-height:100vh;padding:clamp(28px,6vw,88px);background:#07111f;color:#fff8e8;font-family:Arial,sans-serif}
    .server-seo-snapshot__inner{width:min(980px,100%);margin:0 auto}
    .server-seo-snapshot a{color:#f4d58d}
    .server-seo-snapshot h1{max-width:850px;margin:18px 0;font-size:clamp(34px,7vw,72px);line-height:1.02}
    .server-seo-snapshot h2{margin-top:38px;font-size:clamp(24px,4vw,38px)}
    .server-seo-snapshot p{max-width:780px;font-size:18px;line-height:1.65;color:rgba(255,248,232,.78)}
    .server-seo-snapshot__links{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}
    .server-seo-snapshot__links a{padding:11px 15px;border:1px solid rgba(244,213,141,.28);border-radius:999px;text-decoration:none}
    .server-seo-snapshot__cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:26px}
    .server-seo-snapshot__card{padding:18px;border:1px solid rgba(255,255,255,.12);border-radius:18px;background:rgba(255,255,255,.055)}
    .server-seo-snapshot__card h2,.server-seo-snapshot__card h3{margin:0 0 10px;font-size:21px}
    .server-seo-snapshot__card p{margin:0;font-size:15px}
    .server-seo-snapshot__image{width:min(760px,100%);max-height:480px;margin-top:28px;border-radius:24px;object-fit:cover}
</style>
HTML;
}

function seoRenderAppShell(
    array $meta,
    string $snapshot,
    int $statusCode = 200,
    array $structuredData = []
): void {
    $indexPath = dirname(__DIR__) . '/index.html';
    $html = @file_get_contents($indexPath);

    if ($html === false) {
        http_response_code(503);
        header('Content-Type: text/plain; charset=utf-8');
        header('Retry-After: 300');
        echo 'Сайт временно недоступен';
        return;
    }

    $title = seoTruncateText($meta['title'] ?? '', 68, SEO_SITE_NAME);
    $description = seoTruncateText($meta['description'] ?? '', 170, SEO_SITE_NAME);
    $canonical = seoAbsoluteUrl($meta['canonical'] ?? '/');
    $robots = $meta['robots'] ?? 'index, follow, max-image-preview:large';
    $image = seoNormalizeMediaUrl($meta['image'] ?? SEO_DEFAULT_IMAGE);
    $imageAlt = seoNormalizeText($meta['image_alt'] ?? '', $title);
    $type = $meta['type'] ?? 'website';

    $patterns = [
        '/<title\b[^>]*>.*?<\/title>/is',
        '/<link\b[^>]*rel=["\']canonical["\'][^>]*>/is',
        '/<meta\b[^>]*name=["\'](?:description|robots|twitter:card|twitter:title|twitter:description|twitter:image|twitter:image:alt)["\'][^>]*>/is',
        '/<meta\b[^>]*property=["\']og:[^"\']+["\'][^>]*>/is',
        '/<script\b[^>]*data-server-seo=["\']true["\'][^>]*>.*?<\/script>/is',
        '/<style\b[^>]*id=["\']server-seo-snapshot-style["\'][^>]*>.*?<\/style>/is',
    ];

    $html = preg_replace($patterns, '', $html) ?? $html;

    $head = [];
    $head[] = '<title data-rh="true">' . seoHtmlEscape($title) . '</title>';
    $head[] = '<link data-rh="true" rel="canonical" href="' . seoHtmlEscape($canonical) . '">';
    $head[] = '<meta data-rh="true" name="description" content="' . seoHtmlEscape($description) . '">';
    $head[] = '<meta data-rh="true" name="robots" content="' . seoHtmlEscape($robots) . '">';
    $head[] = '<meta data-rh="true" property="og:type" content="' . seoHtmlEscape($type) . '">';
    $head[] = '<meta data-rh="true" property="og:locale" content="ru_RU">';
    $head[] = '<meta data-rh="true" property="og:title" content="' . seoHtmlEscape($title) . '">';
    $head[] = '<meta data-rh="true" property="og:description" content="' . seoHtmlEscape($description) . '">';
    $head[] = '<meta data-rh="true" property="og:url" content="' . seoHtmlEscape($canonical) . '">';
    $head[] = '<meta data-rh="true" property="og:image" content="' . seoHtmlEscape($image) . '">';
    $head[] = '<meta data-rh="true" property="og:image:secure_url" content="' . seoHtmlEscape($image) . '">';
    $head[] = '<meta data-rh="true" property="og:image:alt" content="' . seoHtmlEscape($imageAlt) . '">';
    $head[] = '<meta data-rh="true" property="og:site_name" content="' . SEO_SITE_NAME . '">';
    $head[] = '<meta data-rh="true" name="twitter:card" content="summary_large_image">';
    $head[] = '<meta data-rh="true" name="twitter:title" content="' . seoHtmlEscape($title) . '">';
    $head[] = '<meta data-rh="true" name="twitter:description" content="' . seoHtmlEscape($description) . '">';
    $head[] = '<meta data-rh="true" name="twitter:image" content="' . seoHtmlEscape($image) . '">';
    $head[] = '<meta data-rh="true" name="twitter:image:alt" content="' . seoHtmlEscape($imageAlt) . '">';
    $head[] = seoSnapshotStyles();

    foreach ($structuredData as $item) {
        $head[] = '<script type="application/ld+json" data-server-seo="true">'
            . seoJsonEncode($item)
            . '</script>';
    }

    $html = str_replace('</head>', implode("\n", $head) . "\n</head>", $html);
    $html = preg_replace(
        '/<div\s+id=["\']root["\']\s*>\s*<\/div>/i',
        '<div id="root">' . $snapshot . '</div>',
        $html,
        1
    ) ?? $html;

    http_response_code($statusCode);
    header('Content-Type: text/html; charset=utf-8');
    header('Vary: Accept-Encoding');
    header('X-Content-Type-Options: nosniff');

    if (str_contains(strtolower($robots), 'noindex')) {
        header('X-Robots-Tag: ' . $robots);
    }

    if ($statusCode >= 500) {
        header('Cache-Control: no-store');
        header('Retry-After: 300');
    } elseif ($statusCode >= 400) {
        header('Cache-Control: public, max-age=60');
    } else {
        header('Cache-Control: public, max-age=300, stale-while-revalidate=60');
    }

    echo $html;
}
