<?php

declare(strict_types=1);

const SEO_SITE_URL = 'https://native-places.ru';
const SEO_SITE_NAME = 'Native Places';
const SEO_RELEASE_DATE = '2026-08-10';
const SEO_DEFAULT_IMAGE = '/images/home/hero-bg.webp';

const SEO_STATIC_PAGES = [
    '/' => [
        'title' => 'Native Places — места, отдых и объявления на карте',
        'description' => 'Native Places — информационная площадка и карта мест, недвижимости, аренды, отдыха, рыбалки, охоты и природных маршрутов.',
        'changefreq' => 'daily',
        'priority' => '1.0',
    ],
    '/categories' => [
        'title' => 'Категории мест и объявлений | Native Places',
        'description' => 'Категории Native Places: недвижимость, аренда, базы отдыха, рыбалка, охота и природные места.',
        'changefreq' => 'weekly',
        'priority' => '0.8',
    ],
    '/map' => [
        'title' => 'Интерактивная карта мест и объявлений | Native Places',
        'description' => 'Интерактивная карта Native Places с объявлениями и местами, фильтрами по категориям, типам и населённым пунктам.',
        'changefreq' => 'daily',
        'priority' => '0.8',
    ],
];

const SEO_CATEGORY_PAGES = [
    'real-estate' => [
        'database_code' => 'real_estate',
        'name' => 'Недвижимость',
        'title' => 'Недвижимость у природы — дома и участки | Native Places',
        'description' => 'Недвижимость у природы: дома, участки, дачи и загородные объекты рядом с реками, озёрами, лесом и местами отдыха.',
        'image' => '/images/categories/cards/real-estate.webp',
    ],
    'rent' => [
        'database_code' => 'rent',
        'name' => 'Аренда',
        'title' => 'Аренда домов и мест для отдыха | Native Places',
        'description' => 'Аренда домов, гостевых объектов и помещений рядом с природой. Смотрите объявления и расположение объектов на карте.',
        'image' => '/images/categories/cards/rent.webp',
    ],
    'recreation' => [
        'database_code' => 'recreation',
        'name' => 'Базы отдыха',
        'title' => 'Базы отдыха и гостевые дома | Native Places',
        'description' => 'Базы отдыха, гостевые дома, туркомплексы и загородные места для поездок и отдыха на природе.',
        'image' => '/images/categories/cards/recreation.webp',
    ],
    'fishing' => [
        'database_code' => 'fishing',
        'name' => 'Рыбалка',
        'title' => 'Места для рыбалки и рыболовные базы | Native Places',
        'description' => 'Места для рыбалки, водоёмы, берега и рыболовные базы. Изучайте описания и расположение на карте.',
        'image' => '/images/categories/cards/fishing.webp',
    ],
    'hunting' => [
        'database_code' => 'hunting',
        'name' => 'Охота',
        'title' => 'Охотничьи базы и территории | Native Places',
        'description' => 'Охотничьи базы, угодья и природные территории с описаниями, условиями и расположением на карте.',
        'image' => '/images/categories/cards/hunting.webp',
    ],
    'nature' => [
        'database_code' => 'nature',
        'name' => 'Природа',
        'title' => 'Природные места, парки и маршруты | Native Places',
        'description' => 'Природные места, парки, заповедники, красивые локации и маршруты для отдыха, прогулок и путешествий.',
        'image' => '/images/categories/cards/nature.webp',
    ],
];

const SEO_LEGAL_PAGES = [
    'user-agreement' => 'Пользовательское соглашение',
    'privacy' => 'Политика обработки персональных данных',
    'personal-data-consent' => 'Согласие на обработку персональных данных',
    'publication-consent' => 'Согласие на публикацию данных',
    'marketing-consent' => 'Согласие на рекламные рассылки',
    'content-rules' => 'Правила размещения материалов и модерации',
    'cookie-policy' => 'Политика использования cookie',
    'data-requests' => 'Порядок обращений субъекта персональных данных',
    'free-tariff-rules' => 'Правила бесплатного тарифа',
    'commercial-rules' => 'Правила коммерческих объявлений',
    'paid-services-offer' => 'Проект оферты платных услуг',
];