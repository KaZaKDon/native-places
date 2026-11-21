<?php
declare(strict_types=1);
// Used by server-rendered SEO routes and sitemap, independent of admin API.

function seoDirectoryTypeLabel(string $type): string {
    return [
        'river' => 'Река', 'lake' => 'Озеро или водоём', 'forest' => 'Лес',
        'natural_area' => 'Природная территория', 'hunting_ground' => 'Охотничье угодье',
        'protected_area' => 'Особо охраняемая природная территория',
        'landmark' => 'Достопримечательность', 'spring' => 'Родник',
    ][$type] ?? 'Справочник';
}
function seoDirectoryList(PDO $pdo, int $limit = 120): array {
    $limit = min(max($limit, 1), 1000);
    return $pdo->query("SELECT id, slug, type, title, region, summary, updated_at FROM directory_entries WHERE status='published' ORDER BY published_at DESC, id DESC LIMIT " . $limit)->fetchAll();
}
function seoDirectoryShow(PDO $pdo, string $type, string $slug): ?array {
    $stmt = $pdo->prepare("SELECT e.id, e.slug, e.type, e.title, e.region, e.summary, e.body, e.source_url, e.geometry_geojson, e.updated_at,
        t.official_category, t.official_name, t.managing_body, t.legal_basis_url, t.boundary_source_url, t.access_rules, t.access_source_url, t.checked_at
        FROM directory_entries e LEFT JOIN directory_territory_details t ON t.entry_id=e.id
        WHERE e.status='published' AND e.type=:type AND e.slug=:slug LIMIT 1");
    $stmt->execute(['type' => $type, 'slug' => $slug]);
    return $stmt->fetch() ?: null;
}
function seoDirectoryUrl(array $entry): string {
    return '/directory/' . rawurlencode((string) $entry['type']) . '/' . rawurlencode((string) $entry['slug']);
}
function seoDirectorySnapshotList(array $entries): string {
    $html = '';
    foreach ($entries as $entry) {
        $html .= '<article class="server-seo-snapshot__card">'
            . '<p>' . seoHtmlEscape(seoDirectoryTypeLabel((string) $entry['type'])) . ' · ' . seoHtmlEscape($entry['region'] ?? '') . '</p>'
            . '<h2><a href="' . seoHtmlEscape(seoDirectoryUrl($entry)) . '">' . seoHtmlEscape($entry['title'] ?? '') . '</a></h2>'
            . '<p>' . seoHtmlEscape($entry['summary'] ?? '') . '</p></article>';
    }
    if ($html === '') $html = '<p>Пока нет опубликованных справочных объектов.</p>';
    return seoSnapshotLayout(
        '<p><a href="/">Главная</a></p>'
        . '<h1>Справочник мест</h1>'
        . '<p>Бесплатная информация о реках, водоёмах, природных территориях и интересных местах. Не является платными объявлениями.</p>'
        . '<section class="server-seo-snapshot__cards" aria-label="Справочные объекты">' . $html . '</section>'
        . seoSnapshotNavigation()
    );
}
function seoDirectorySnapshotEntry(array $entry, array $species = []): string {
    $parts = preg_split('/\n\s*\n/u', str_replace("\r", '', (string) $entry['body'])) ?: [];
    $paragraphs = '';
    foreach ($parts as $part) {
        $part = trim($part);
        if ($part !== '') $paragraphs .= '<p>' . nl2br(seoHtmlEscape($part), false) . '</p>';
    }
    $source = (string) ($entry['source_url'] ?? '');
    $sourceLink = '';
    if (filter_var($source, FILTER_VALIDATE_URL) && in_array(strtolower((string) parse_url($source, PHP_URL_SCHEME)), ['https', 'http'], true)) {
        $sourceLink = '<p>Источник: <a href="' . seoHtmlEscape($source) . '" rel="noopener noreferrer">' . seoHtmlEscape($source) . '</a></p>';
    }
    $speciesHtml = '';
    foreach ($species as $fish) {
        $speciesHtml .= '<li><a href="/directory/species/' . rawurlencode((string)$fish['slug']) . '">'
            . seoHtmlEscape($fish['common_name']) . '</a> — ' . seoHtmlEscape($fish['summary']) . '</li>';
    }
    if ($speciesHtml !== '') $speciesHtml = '<h2>Виды рыб</h2><ul>' . $speciesHtml . '</ul>';
    $territory = '';
    if (in_array((string)$entry['type'], ['protected_area', 'hunting_ground'], true)) {
        $category = [
            'zapovednik' => 'Заповедник', 'zakaznik' => 'Заказник',
            'national_park' => 'Национальный парк', 'natural_park' => 'Природный парк',
            'nature_monument' => 'Памятник природы', 'other' => 'Другая ООПТ',
        ][$entry['official_category'] ?? ''] ?? '';
        $territory = '<section><h2>Статус и территория</h2>'
            . ($category !== '' ? '<p>Категория: ' . seoHtmlEscape($category) . '</p>' : '')
            . '<p>Официальное название: ' . seoHtmlEscape($entry['official_name'] ?? '') . '</p>'
            . (!empty($entry['managing_body']) ? '<p>Управляющая организация: ' . seoHtmlEscape($entry['managing_body']) . '</p>' : '')
            . (!empty($entry['geometry_geojson']) && !empty($entry['boundary_source_url']) ? '<p>Контур основан на <a href="' . seoHtmlEscape($entry['boundary_source_url']) . '">источнике границ</a>.</p>' : '<p>Точный контур территории пока не опубликован.</p>')
            . (!empty($entry['access_rules']) ? '<h3>Посещение и ограничения</h3><p>' . nl2br(seoHtmlEscape($entry['access_rules']), false) . '</p><p>Проверено: ' . seoHtmlEscape($entry['checked_at'] ?? '') . '. <a href="' . seoHtmlEscape($entry['access_source_url']) . '">Источник режима</a>.</p>' : '<p>Режим посещения уточняйте у администрации территории.</p>')
            . '<p><a href="' . seoHtmlEscape($entry['legal_basis_url'] ?? '') . '">Правовой документ</a></p></section>';
    }
    return seoSnapshotLayout(
        '<p><a href="/directory">Все объекты справочника</a></p>'
        . '<p>' . seoHtmlEscape(seoDirectoryTypeLabel((string) $entry['type'])) . '</p>'
        . '<h1>' . seoHtmlEscape($entry['title']) . '</h1>'
        . (!empty($entry['region']) ? '<p>' . seoHtmlEscape($entry['region']) . '</p>' : '')
        . '<p>' . seoHtmlEscape($entry['summary']) . '</p>'
        . '<h2>Об объекте</h2>' . $paragraphs
        . $sourceLink
        . $territory
        . $speciesHtml
        . seoSnapshotNavigation()
    );
}
