import { Helmet } from "react-helmet-async";

import {
    DEFAULT_ROBOTS,
    DEFAULT_SEO_DESCRIPTION,
    DEFAULT_SEO_IMAGE,
    DEFAULT_SEO_TITLE,
    SITE_LOCALE,
    SITE_NAME,
    normalizeSeoText,
    toAbsoluteSiteUrl,
    truncateSeoText,
} from "./seoConfig";

export function Seo({
    title = DEFAULT_SEO_TITLE,
    description = DEFAULT_SEO_DESCRIPTION,
    canonical,
    image = DEFAULT_SEO_IMAGE,
    imageAlt,
    structuredData,
    robots = DEFAULT_ROBOTS,
    type = "website",
}) {
    const pageTitle = truncateSeoText(title, 68);
    const pageDescription = truncateSeoText(description, 170);
    const canonicalUrl = canonical ? toAbsoluteSiteUrl(canonical) : "";
    const previewImage = toAbsoluteSiteUrl(image);
    const previewImageAlt = normalizeSeoText(
        imageAlt,
        `${pageTitle} — ${SITE_NAME}`
    );
    const structuredDataItems = (Array.isArray(structuredData)
        ? structuredData
        : [structuredData]
    ).filter(Boolean);

    return (
        <Helmet htmlAttributes={{ lang: "ru" }}>
            <title>{pageTitle}</title>

            <meta name="description" content={pageDescription} />
            <meta name="robots" content={robots} />

            {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

            <meta property="og:type" content={type} />
            <meta property="og:locale" content={SITE_LOCALE} />
            <meta property="og:title" content={pageTitle} />
            <meta property="og:description" content={pageDescription} />

            {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}

            <meta property="og:image" content={previewImage} />
            <meta property="og:image:secure_url" content={previewImage} />
            <meta property="og:image:alt" content={previewImageAlt} />

            <meta property="og:site_name" content={SITE_NAME} />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={pageTitle} />
            <meta name="twitter:description" content={pageDescription} />
            <meta name="twitter:image" content={previewImage} />
            <meta name="twitter:image:alt" content={previewImageAlt} />

            {structuredDataItems.map((item, index) => (
                <script type="application/ld+json" key={item["@id"] || index}>
                    {JSON.stringify(item)}
                </script>
            ))}
        </Helmet>
    );
}
