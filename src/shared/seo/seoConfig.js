export const SITE_NAME = "Native Places";
export const SITE_URL = "https://native-places.ru";
export const SITE_LOCALE = "ru_RU";

export const DEFAULT_SEO_TITLE =
    "Native Places — места, отдых и объявления на карте";

export const DEFAULT_SEO_DESCRIPTION =
    "Native Places — информационная площадка и карта мест, недвижимости, аренды, отдыха, рыбалки, охоты и природных маршрутов.";

export const DEFAULT_SEO_IMAGE = `${SITE_URL}/images/home/hero-bg.webp`;
export const DEFAULT_ROBOTS = "index, follow, max-image-preview:large";
export const NOINDEX_ROBOTS = "noindex, nofollow, noarchive";
export const NOINDEX_FOLLOW_ROBOTS = "noindex, follow, noarchive";

export function toAbsoluteSiteUrl(value = "/") {
    if (/^https?:\/\//i.test(value)) {
        return value;
    }

    const normalizedPath = value.startsWith("/") ? value : `/${value}`;

    return `${SITE_URL}${normalizedPath}`;
}

export function normalizeSeoText(value, fallback = "") {
    const normalizedValue = String(value ?? "")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    return normalizedValue || fallback;
}

export function truncateSeoText(value, maxLength = 160) {
    const normalizedValue = normalizeSeoText(value);

    if (normalizedValue.length <= maxLength) {
        return normalizedValue;
    }

    const truncatedValue = normalizedValue.slice(0, maxLength - 1);
    const lastSpaceIndex = truncatedValue.lastIndexOf(" ");
    const safeValue = lastSpaceIndex > maxLength * 0.65
        ? truncatedValue.slice(0, lastSpaceIndex)
        : truncatedValue;

    return `${safeValue.trimEnd()}…`;
}

export function createBreadcrumbStructuredData(items) {
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            item: toAbsoluteSiteUrl(item.path),
        })),
    };
}
