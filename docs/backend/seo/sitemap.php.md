# Dynamic sitemap for `https://native-places.ru/sitemap.xml`

## Назначение

Статический `public/sitemap.xml` подходит для первого деплоя, но для SEO карточек объявлений нужен динамический sitemap из базы. Он должен включать:

- основные публичные страницы сайта;
- опубликованные категории;
- опубликованные карточки мест `/place/{slug}` из таблицы `places`;
- `lastmod` из `places.updated_at` или `places.created_at`.

## Размещение на хосте

Рекомендуемый файл:

```txt
sitemap.php
```

На уровне сайта нужно сделать, чтобы URL `/sitemap.xml` отдавал этот PHP-файл. Например через nginx rewrite:

```nginx
location = /sitemap.xml {
    rewrite ^ /sitemap.php last;
}
```

Если rewrite пока не настроен, можно временно открыть `https://native-places.ru/sitemap.php`, но в `robots.txt` лучше оставить именно `/sitemap.xml`.

## PHP-код

```php
<?php

require_once __DIR__ . '/api/config/database.php';

const SITE_URL = 'https://native-places.ru';

function xmlEscape(string $value): string
{
    return htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
}

function formatSitemapDate(?string $date): string
{
    if (!$date) {
        return date('Y-m-d');
    }

    try {
        return (new DateTimeImmutable($date))->format('Y-m-d');
    } catch (Throwable $e) {
        return date('Y-m-d');
    }
}

function printUrl(string $loc, string $lastmod, string $changefreq, string $priority): void
{
    echo "  <url>\n";
    echo '    <loc>' . xmlEscape($loc) . "</loc>\n";
    echo '    <lastmod>' . xmlEscape($lastmod) . "</lastmod>\n";
    echo '    <changefreq>' . xmlEscape($changefreq) . "</changefreq>\n";
    echo '    <priority>' . xmlEscape($priority) . "</priority>\n";
    echo "  </url>\n";
}

$today = date('Y-m-d');

header('Content-Type: application/xml; charset=utf-8');

echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
echo "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n";

$staticPages = [
    ['/', 'daily', '1.0'],
    ['/categories', 'weekly', '0.8'],
    ['/category/real-estate', 'weekly', '0.7'],
    ['/category/rent', 'weekly', '0.7'],
    ['/category/recreation', 'weekly', '0.7'],
    ['/category/fishing', 'weekly', '0.7'],
    ['/category/hunting', 'weekly', '0.7'],
    ['/category/nature', 'weekly', '0.7'],
    ['/map', 'daily', '0.8'],
    ['/rules', 'monthly', '0.3'],
    ['/privacy-policy', 'monthly', '0.3'],
    ['/user-agreement', 'monthly', '0.3'],
];

foreach ($staticPages as [$path, $changefreq, $priority]) {
    printUrl(SITE_URL . $path, $today, $changefreq, $priority);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->query("
        SELECT
            slug,
            COALESCE(updated_at, created_at) AS lastmod
        FROM places
        WHERE status = 'published'
        AND slug IS NOT NULL
        AND slug <> ''
        ORDER BY updated_at DESC, id DESC
        LIMIT 50000
    ");

    foreach ($stmt->fetchAll() as $place) {
        printUrl(
            SITE_URL . '/place/' . rawurlencode((string) $place['slug']),
            formatSitemapDate($place['lastmod'] ?? null),
            'weekly',
            '0.6'
        );
    }
} catch (Throwable $e) {
    // Sitemap не должен падать полностью из-за временной ошибки БД.
    // Статические URL уже выведены выше.
}

echo "</urlset>\n";
```

## Проверка после загрузки

```bash
curl -I https://native-places.ru/sitemap.xml
curl https://native-places.ru/sitemap.xml | head
```

Ожидаемо:

- HTTP `200`;
- `Content-Type: application/xml; charset=utf-8`;
- внутри есть статические URL и опубликованные `/place/{slug}`.
