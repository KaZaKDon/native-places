<?php

declare(strict_types=1);

function seoSnapshotLayout(string $content): string
{
    return '<main class="server-seo-snapshot"><div class="server-seo-snapshot__inner">'
        . $content
        . '</div></main>';
}

function seoSnapshotNavigation(): string
{
    return '<nav class="server-seo-snapshot__links" aria-label="Основные разделы">'
        . '<a href="/">Главная</a>'
        . '<a href="/categories">Категории</a>'
        . '<a href="/map">Карта</a>'
        . '</nav>';
}

function seoHomeSnapshot(): string
{
    return seoSnapshotLayout(
        '<p>Native Places</p>'
        . '<h1>Родные места</h1>'
        . '<p>Недвижимость, аренда, отдых, рыбалка и природа на одной карте.</p>'
        . seoSnapshotNavigation()
    );
}

function seoCategoriesSnapshot(): string
{
    $cards = '';

    foreach (SEO_CATEGORY_PAGES as $slug => $category) {
        $cards .= '<article class="server-seo-snapshot__card">'
            . '<h2><a href="/category/' . seoHtmlEscape($slug) . '">'
            . seoHtmlEscape($category['name'])
            . '</a></h2>'
            . '<p>' . seoHtmlEscape($category['description']) . '</p>'
            . '</article>';
    }

    return seoSnapshotLayout(
        '<p><a href="/">Native Places</a></p>'
        . '<h1>Категории мест и объявлений</h1>'
        . '<p>Выберите направление и откройте опубликованные места списком или на карте.</p>'
        . '<section class="server-seo-snapshot__cards" aria-label="Категории">'
        . $cards
        . '</section>'
        . seoSnapshotNavigation()
    );
}

function seoCategorySnapshot(array $category, array $places): string
{
    $cards = '';

    foreach ($places as $place) {
        $description = seoTruncateText(
            $place['short_description'] ?? '',
            180,
            $place['locality_title'] ?? ''
        );
        $cards .= '<article class="server-seo-snapshot__card">'
            . '<h2><a href="/place/' . rawurlencode((string) $place['slug']) . '">'
            . seoHtmlEscape($place['title'] ?? '')
            . '</a></h2>'
            . ($description !== '' ? '<p>' . seoHtmlEscape($description) . '</p>' : '')
            . '</article>';
    }

    if ($cards === '') {
        $cards = '<p>В этой категории пока нет опубликованных объявлений.</p>';
    }

    return seoSnapshotLayout(
        '<p><a href="/categories">Все категории</a></p>'
        . '<h1>' . seoHtmlEscape($category['name']) . '</h1>'
        . '<p>' . seoHtmlEscape($category['description']) . '</p>'
        . '<section class="server-seo-snapshot__cards" aria-label="Опубликованные места">'
        . $cards
        . '</section>'
        . seoSnapshotNavigation()
    );
}

function seoMapSnapshot(): string
{
    return seoSnapshotLayout(
        '<p><a href="/">Native Places</a></p>'
        . '<h1>Интерактивная карта мест и объявлений</h1>'
        . '<p>Откройте карту и используйте фильтры по категориям, типам и населённым пунктам.</p>'
        . seoSnapshotNavigation()
    );
}

function seoPlaceSnapshot(array $place): string
{
    $description = seoNormalizeText(
        $place['full_description'] ?? '',
        seoNormalizeText($place['short_description'] ?? '', 'Описание пока не добавлено.')
    );
    $locationParts = array_values(array_unique(array_filter([
        $place['locality_title'] ?? null,
        $place['district_title'] ?? null,
        $place['region_title'] ?? null,
    ])));
    $location = implode(', ', $locationParts);
    $image = seoNormalizeMediaUrl($place['seo_image'] ?? null);
    $contacts = '';

    foreach ([
        'contact_name' => 'Контактное лицо',
        'phone' => 'Телефон',
        'email' => 'Email',
        'telegram' => 'Telegram',
        'website' => 'Сайт',
    ] as $field => $label) {
        if (!empty($place[$field])) {
            $contacts .= '<p><strong>' . seoHtmlEscape($label) . ':</strong> '
                . seoHtmlEscape((string) $place[$field])
                . '</p>';
        }
    }

    return seoSnapshotLayout(
        '<p><a href="/categories">Категории</a> · '
        . seoHtmlEscape($place['category_title'] ?? '')
        . '</p>'
        . '<h1>' . seoHtmlEscape($place['title'] ?? '') . '</h1>'
        . ($location !== '' ? '<p>' . seoHtmlEscape($location) . '</p>' : '')
        . (!empty($place['address'])
            ? '<p><strong>Адрес или ориентир:</strong> ' . seoHtmlEscape($place['address']) . '</p>'
            : '')
        . '<img class="server-seo-snapshot__image" src="' . seoHtmlEscape($image) . '" alt="'
        . seoHtmlEscape(($place['title'] ?? '') . ' — фотография места')
        . '">'
        . '<h2>Описание</h2><p>' . seoHtmlEscape($description) . '</p>'
        . ($contacts !== '' ? '<h2>Публичные контакты</h2>' . $contacts : '')
        . seoSnapshotNavigation()
    );
}

function seoGenericSnapshot(string $eyebrow, string $title, string $description): string
{
    return seoSnapshotLayout(
        '<p>' . seoHtmlEscape($eyebrow) . '</p>'
        . '<h1>' . seoHtmlEscape($title) . '</h1>'
        . '<p>' . seoHtmlEscape($description) . '</p>'
        . seoSnapshotNavigation()
    );
}

function seoNotFoundSnapshot(): string
{
    return seoGenericSnapshot(
        'Ошибка 404',
        'Страница не найдена',
        'Адрес введён с ошибкой, страница была перемещена или объект больше не опубликован.'
    );
}