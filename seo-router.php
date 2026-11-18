<?php

declare(strict_types=1);

require_once __DIR__ . '/seo/config.php';
require_once __DIR__ . '/seo/helpers.php';
require_once __DIR__ . '/seo/data.php';
require_once __DIR__ . '/seo/snapshots.php';
require_once __DIR__ . '/seo/directory.php';
require_once __DIR__ . '/seo/species.php';

function seoGetDatabaseConnection(): PDO
{
    require_once __DIR__ . '/api/config/database.php';

    return getDatabaseConnection();
}

function seoRequestedPath(): string
{
    $requestUri = (string) ($_SERVER['REQUEST_URI'] ?? '/');
    $path = parse_url($requestUri, PHP_URL_PATH);

    if (!is_string($path) || $path === '') {
        return '/';
    }

    $decodedPath = rawurldecode($path);

    if (str_contains($decodedPath, "\0") || str_contains($decodedPath, '..')) {
        return '/__invalid_path__';
    }

    return $decodedPath === '/' ? '/' : rtrim($decodedPath, '/');
}

function seoRedirectUrl(string $path, bool $keepQuery = false): string
{
    $url = SEO_SITE_URL . $path;
    $query = (string) ($_SERVER['QUERY_STRING'] ?? '');

    if ($keepQuery && $query !== '') {
        $url .= '?' . $query;
    }

    return $url;
}

function seoCategoryPublicSlug(string $databaseCode): ?string
{
    foreach (SEO_CATEGORY_PAGES as $slug => $category) {
        if ($category['database_code'] === $databaseCode) {
            return $slug;
        }
    }

    return null;
}

function seoRenderNotFound(string $path): void
{
    seoRenderAppShell(
        [
            'title' => 'Страница не найдена | Native Places',
            'description' => 'Страница Native Places не найдена или больше недоступна.',
            'canonical' => $path,
            'robots' => 'noindex, nofollow, noarchive',
        ],
        seoNotFoundSnapshot(),
        404
    );
}

$path = seoRequestedPath();
$legacyRedirects = [
    '/rules' => '/legal/content-rules',
    '/privacy-policy' => '/legal/privacy',
    '/user-agreement' => '/legal/user-agreement',
];

if (isset($legacyRedirects[$path])) {
    header('Location: ' . seoRedirectUrl($legacyRedirects[$path]), true, 301);
    exit;
}

$rawPath = parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH);

if ($path !== '/' && is_string($rawPath) && str_ends_with($rawPath, '/')) {
    header('Location: ' . seoRedirectUrl($path, true), true, 301);
    exit;
}

if ($path === '/') {
    seoRenderAppShell(
        [
            ...SEO_STATIC_PAGES['/'],
            'canonical' => '/',
            'image' => SEO_DEFAULT_IMAGE,
            'image_alt' => 'Native Places — родные места на интерактивной карте',
        ],
        seoHomeSnapshot(),
        200,
        [
            [
                '@context' => 'https://schema.org',
                '@type' => 'Organization',
                '@id' => SEO_SITE_URL . '/#organization',
                'name' => SEO_SITE_NAME,
                'url' => SEO_SITE_URL . '/',
                'logo' => SEO_SITE_URL . '/images/logo/logo.png',
            ],
            [
                '@context' => 'https://schema.org',
                '@type' => 'WebSite',
                '@id' => SEO_SITE_URL . '/#website',
                'name' => SEO_SITE_NAME,
                'alternateName' => 'Родные места',
                'url' => SEO_SITE_URL . '/',
                'inLanguage' => 'ru-RU',
            ],
        ]
    );
    exit;
}

if ($path === '/categories') {
    seoRenderAppShell(
        [
            ...SEO_STATIC_PAGES['/categories'],
            'canonical' => '/categories',
            'image' => '/images/categories/categories-bg.webp',
            'image_alt' => 'Категории мест и объявлений Native Places',
        ],
        seoCategoriesSnapshot(),
        200,
        [
            seoBreadcrumbs([
                ['name' => 'Главная', 'path' => '/'],
                ['name' => 'Категории', 'path' => '/categories'],
            ]),
        ]
    );
    exit;
}

// A separate free information directory; only records with status=published are public.
if ($path === '/directory') {
    try {
        $entries = seoDirectoryList(seoGetDatabaseConnection());
    } catch (Throwable $error) {
        error_log('[server-seo/directory-list] ' . $error->getMessage());
        seoRenderAppShell(
            ['title' => 'Справочник временно недоступен | Native Places', 'description' => 'Повторите попытку позднее.', 'canonical' => '/directory', 'robots' => 'noindex, nofollow, noarchive'],
            seoGenericSnapshot('Временная ошибка', 'Справочник временно недоступен', 'Попробуйте позднее.'), 503
        );
        exit;
    }
    seoRenderAppShell(
        [
            'title' => 'Справочник рек, природных мест и достопримечательностей | Native Places',
            'description' => 'Бесплатный справочник рек, водоёмов, природных территорий, охотничьих угодий и интересных мест. Описания и география на карте Native Places.',
            'canonical' => '/directory',
            'robots' => $entries ? 'index, follow, max-image-preview:large' : 'noindex, follow',
        ],
        seoDirectorySnapshotList($entries), 200,
        [seoBreadcrumbs([
            ['name' => 'Главная', 'path' => '/'],
            ['name' => 'Справочник', 'path' => '/directory'],
        ])]
    );
    exit;
}

// Public species SEO pages. Only fully published species with published evidence are indexable.
// The species route MUST be before the generic /directory/{type}/{slug} route.
if (preg_match('#^/directory/species/([a-z0-9-]+)$#', $path, $matches)) {
    $slug = $matches[1];
    try {
        $fish = seoSpeciesShow(seoGetDatabaseConnection(), $slug);
    } catch (Throwable $error) {
        error_log('[server-seo/species] ' . $error->getMessage());
        seoRenderAppShell(
            [
                'title' => 'Справочник временно недоступен | Native Places',
                'description' => 'Попробуйте позднее.',
                'canonical' => $path,
                'robots' => 'noindex, nofollow, noarchive',
            ],
            seoGenericSnapshot('Временная ошибка', 'Информация о виде временно недоступна', 'Попробуйте позднее.'),
            503
        );
        exit;
    }

    if ($fish === null) {
        seoRenderNotFound($path);
        exit;
    }

    $imagePath = !empty($fish['cover_image_id'])
        ? '/api/directory/image.php?id=' . (int) $fish['cover_image_id']
        : SEO_DEFAULT_IMAGE;
    $fishName = (string) $fish['common_name'];
    seoRenderAppShell(
        [
            'title' => $fishName . ' (' . (string) ($fish['scientific_name'] ?: 'вид рыбы') . ') — описание | Native Places',
            'description' => (string) $fish['summary'],
            'canonical' => $path,
            'robots' => 'index, follow, max-image-preview:large',
            'image' => $imagePath,
            'image_alt' => $fishName . ' — иллюстрация вида',
        ],
        seoSpeciesSnapshot($fish),
        200,
        [
            seoBreadcrumbs([
                ['name' => 'Главная', 'path' => '/'],
                ['name' => 'Справочник', 'path' => '/directory'],
                ['name' => $fishName, 'path' => $path],
            ]),
            [
                '@context' => 'https://schema.org',
                '@type' => 'Taxon',
                '@id' => SEO_SITE_URL . $path . '#taxon',
                'name' => $fishName,
                'alternateName' => $fish['scientific_name'] ?: null,
                'description' => $fish['summary'],
                'url' => SEO_SITE_URL . $path,
                'image' => SEO_SITE_URL . $imagePath,
            ],
        ]
    );
    exit;
}

if (preg_match('#^/directory/([a-z_]+)/([a-z0-9-]+)$#', $path, $matches)) {
    [, $type, $slug] = $matches;
    if (!in_array($type, ['river', 'lake', 'forest', 'natural_area', 'hunting_ground', 'landmark', 'spring'], true)) {
        seoRenderNotFound($path);
        exit;
    }
    try {
        $entry = seoDirectoryShow(seoGetDatabaseConnection(), $type, $slug);
        $fishOfEntry = [];
        if ($entry !== null && $type === 'river') {
            // Broken species data must not take the already published river page offline.
            try {
                $fishOfEntry = seoSpeciesOfEntry(seoGetDatabaseConnection(), (int) $entry['id']);
            } catch (Throwable $error) {
                error_log('[server-seo/river-species] ' . $error->getMessage());
            }
        }
    } catch (Throwable $error) {
        error_log('[server-seo/directory-entry] ' . $error->getMessage());
        seoRenderAppShell(
            ['title' => 'Справочник временно недоступен | Native Places', 'description' => 'Повторите попытку позднее.', 'canonical' => $path, 'robots' => 'noindex, nofollow, noarchive'],
            seoGenericSnapshot('Временная ошибка', 'Справочник временно недоступен', 'Попробуйте позднее.'), 503
        );
        exit;
    }
    if ($entry === null) {
        seoRenderNotFound($path);
        exit;
    }
    $description = trim((string) $entry['summary'] . ' ' . (string) ($entry['region'] ?? ''));
    seoRenderAppShell(
        [
            'title' => $entry['title'] . ' — ' . seoDirectoryTypeLabel($type) . ' | Native Places',
            'description' => $description,
            'canonical' => $path,
            'robots' => 'index, follow, max-image-preview:large',
        ],
        seoDirectorySnapshotEntry($entry, $fishOfEntry), 200,
        [
            seoBreadcrumbs([
                ['name' => 'Главная', 'path' => '/'],
                ['name' => 'Справочник', 'path' => '/directory'],
                ['name' => $entry['title'], 'path' => $path],
            ]),
            [
                '@context' => 'https://schema.org', '@type' => 'Place',
                '@id' => SEO_SITE_URL . $path . '#place', 'name' => $entry['title'],
                'description' => $entry['summary'], 'url' => SEO_SITE_URL . $path,
            ],
        ]
    );
    exit;
}

if ($path === '/map') {
    seoRenderAppShell(
        [
            ...SEO_STATIC_PAGES['/map'],
            'canonical' => '/map',
            'image' => SEO_DEFAULT_IMAGE,
            'image_alt' => 'Интерактивная карта Native Places',
        ],
        seoMapSnapshot(),
        200,
        [
            seoBreadcrumbs([
                ['name' => 'Главная', 'path' => '/'],
                ['name' => 'Карта', 'path' => '/map'],
            ]),
        ]
    );
    exit;
}

if (preg_match('#^/category/([a-z0-9-]+)$#', $path, $matches)) {
    $slug = $matches[1];
    $category = SEO_CATEGORY_PAGES[$slug] ?? null;

    if ($category === null) {
        seoRenderNotFound($path);
        exit;
    }

    $places = [];

    try {
        $places = seoGetCategoryPlaces(
            seoGetDatabaseConnection(),
            $category['database_code']
        );
    } catch (Throwable $e) {
        error_log('[server-seo/category] ' . $e->getMessage());
        seoRenderAppShell(
            [
                'title' => 'Категория временно недоступна | Native Places',
                'description' => 'Не удалось загрузить объявления. Повторите попытку позже.',
                'canonical' => $path,
                'robots' => 'noindex, nofollow, noarchive',
            ],
            seoGenericSnapshot(
                'Временная ошибка',
                'Объявления временно недоступны',
                'Повторите попытку через несколько минут.'
            ),
            503
        );
        exit;
    }

    $itemList = array_map(
        static fn(array $place, int $index): array => [
            '@type' => 'ListItem',
            'position' => $index + 1,
            'name' => $place['title'],
            'url' => SEO_SITE_URL . '/place/' . rawurlencode((string) $place['slug']),
        ],
        $places,
        array_keys($places)
    );

    seoRenderAppShell(
        [
            'title' => $category['title'],
            'description' => $category['description'],
            'canonical' => $path,
            'image' => $category['image'],
            'image_alt' => $category['name'] . ' — категория Native Places',
        ],
        seoCategorySnapshot($category, $places),
        200,
        [
            seoBreadcrumbs([
                ['name' => 'Главная', 'path' => '/'],
                ['name' => 'Категории', 'path' => '/categories'],
                ['name' => $category['name'], 'path' => $path],
            ]),
            [
                '@context' => 'https://schema.org',
                '@type' => 'CollectionPage',
                '@id' => SEO_SITE_URL . $path . '#collection',
                'name' => $category['heading'] ?? $category['name'],
                'description' => $category['description'],
                'url' => SEO_SITE_URL . $path,
                'inLanguage' => 'ru-RU',
                'mainEntity' => [
                    '@type' => 'ItemList',
                    'numberOfItems' => count($itemList),
                    'itemListElement' => $itemList,
                ],
            ],
        ]
    );
    exit;
}

if (preg_match('#^/place/([a-z0-9_-]+)$#', $path, $matches)) {
    $slug = $matches[1];

    try {
        $place = seoGetPublishedPlace(seoGetDatabaseConnection(), $slug);
    } catch (Throwable $e) {
        error_log('[server-seo/place] ' . $e->getMessage());
        seoRenderAppShell(
            [
                'title' => 'Сайт временно недоступен | Native Places',
                'description' => 'Не удалось загрузить информацию о месте. Повторите попытку позже.',
                'canonical' => $path,
                'robots' => 'noindex, nofollow, noarchive',
            ],
            seoGenericSnapshot(
                'Временная ошибка',
                'Не удалось загрузить место',
                'Повторите попытку через несколько минут.'
            ),
            503
        );
        exit;
    }

    if ($place === null) {
        seoRenderNotFound($path);
        exit;
    }

    $categorySlug = seoCategoryPublicSlug((string) ($place['category_code'] ?? ''));
    $description = seoPlaceMetaDescription($place);
    $breadcrumbs = [
        ['name' => 'Главная', 'path' => '/'],
        ['name' => 'Категории', 'path' => '/categories'],
    ];

    if ($categorySlug !== null) {
        $breadcrumbs[] = [
            'name' => $place['category_title'] ?? 'Категория',
            'path' => '/category/' . $categorySlug,
        ];
    }

    $breadcrumbs[] = ['name' => $place['title'], 'path' => $path];
    $placeSchema = [
        '@context' => 'https://schema.org',
        '@type' => 'Place',
        '@id' => SEO_SITE_URL . $path . '#place',
        'name' => $place['title'],
        'description' => $description,
        'url' => SEO_SITE_URL . $path,
        'address' => $place['address'] ?: ($place['locality_title'] ?? null),
        'category' => $place['category_title'] ?? null,
        'additionalType' => $place['type_title'] ?? null,
    ];

    if (!empty($place['seo_image'])) {
        $placeSchema['image'] = seoNormalizeMediaUrl($place['seo_image']);
    }

    if (
        is_numeric($place['latitude'] ?? null)
        && is_numeric($place['longitude'] ?? null)
        && (float) $place['latitude'] >= -90
        && (float) $place['latitude'] <= 90
        && (float) $place['longitude'] >= -180
        && (float) $place['longitude'] <= 180
    ) {
        $placeSchema['geo'] = [
            '@type' => 'GeoCoordinates',
            'latitude' => (float) $place['latitude'],
            'longitude' => (float) $place['longitude'],
        ];
    }

    seoRenderAppShell(
        [
            'title' => seoPlaceMetaTitle($place),
            'description' => $description,
            'canonical' => $path,
            'image' => $place['seo_image'] ?? SEO_DEFAULT_IMAGE,
            'image_alt' => $place['title'] . ' — фотография места',
            'type' => 'website',
        ],
        seoPlaceSnapshot($place),
        200,
        [seoBreadcrumbs($breadcrumbs), $placeSchema]
    );
    exit;
}

if (preg_match('#^/legal/([a-z0-9-]+)$#', $path, $matches)) {
    $documentTitle = SEO_LEGAL_PAGES[$matches[1]] ?? null;

    if ($documentTitle === null) {
        seoRenderNotFound($path);
        exit;
    }

    seoRenderAppShell(
        [
            'title' => $documentTitle . ' | Native Places',
            'description' => $documentTitle . ' Native Places. Рабочая редакция.',
            'canonical' => $path,
            'robots' => 'noindex, nofollow, noarchive',
        ],
        seoGenericSnapshot(
            'Документы Native Places',
            $documentTitle,
            'Документ откроется после загрузки приложения.'
        )
    );
    exit;
}

$noindexRoutes = [
    '/auth' => ['Вход и регистрация', 'Авторизация пользователя Native Places.'],
    '/verify-email' => ['Подтверждение email', 'Подтверждение электронной почты пользователя.'],
    '/account' => ['Личный кабинет', 'Личный раздел пользователя Native Places.'],
    '/submit' => ['Форма объявления', 'Добавление и редактирование объявления.'],
    '/submit/location' => ['Координаты объявления', 'Выбор координат объявления на карте.'],
];

if (isset($noindexRoutes[$path])) {
    [$title, $description] = $noindexRoutes[$path];
    seoRenderAppShell(
        [
            'title' => $title . ' | Native Places',
            'description' => $description,
            'canonical' => $path,
            'robots' => 'noindex, nofollow, noarchive',
        ],
        seoGenericSnapshot('Native Places', $title, $description)
    );
    exit;
}

if (
    preg_match('#^/routes/[0-9]+$#', $path)
    || preg_match('#^/routes/share/[a-zA-Z0-9_-]+$#', $path)
) {
    seoRenderAppShell(
        [
            'title' => 'Маршрут | Native Places',
            'description' => 'Маршрут пользователя Native Places.',
            'canonical' => $path,
            'robots' => 'noindex, follow, noarchive',
        ],
        seoGenericSnapshot(
            'Native Places',
            'Маршрут',
            'Маршрут откроется после загрузки приложения.'
        )
    );
    exit;
}

seoRenderNotFound($path);
