<?php
declare(strict_types=1);
// Used by server-rendered SEO routes and sitemap, independent of admin API.

function seoDirectoryTypeLabel(string $type): string {
    return [
        'river' => 'Река', 'lake' => 'Озеро или водоём', 'forest' => 'Лес',
        'natural_area' => 'Природная территория', 'hunting_ground' => 'Охотничье угодье',
        'landmark' => 'Достопримечательность', 'spring' => 'Родник',
    ][$type] ?? 'Справочник';
}
function seoDirectoryList(PDO $pdo, int $limit = 120): array {
    $limit = min(max($limit, 1), 1000);
    return $pdo->query("SELECT id, slug, type, title, region, summary, updated_at FROM directory_entries WHERE status='published' ORDER BY published_at DESC, id DESC LIMIT " . $limit)->fetchAll();
}
function seoDirectoryShow(PDO $pdo, string $type, string $slug): ?array {
    $stmt = $pdo->prepare("SELECT id, slug, type, title, region, summary, body, source_url, updated_at FROM directory_entries WHERE status='published' AND type=:type AND slug=:slug LIMIT 1");
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
    return seoSnapshotLayout(
        '<p><a href="/directory">Все объекты справочника</a></p>'
        . '<p>' . seoHtmlEscape(seoDirectoryTypeLabel((string) $entry['type'])) . '</p>'
        . '<h1>' . seoHtmlEscape($entry['title']) . '</h1>'
        . (!empty($entry['region']) ? '<p>' . seoHtmlEscape($entry['region']) . '</p>' : '')
        . '<p>' . seoHtmlEscape($entry['summary']) . '</p>'
        . '<h2>Об объекте</h2>' . $paragraphs
        . $sourceLink
        . $speciesHtml
        . seoSnapshotNavigation()
    );
}
