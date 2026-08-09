import { Helmet } from "react-helmet-async";

export function Seo({ title, description, canonical, image, structuredData, robots }) {
    const previewImage = image || "https://native-places.ru/images/logo/logo.png";

    return (
        <Helmet>
            <title>{title}</title>

            <meta name="description" content={description} />
            {robots && <meta name="robots" content={robots} />}

            {canonical && <link rel="canonical" href={canonical} />}

            <meta property="og:type" content="website" />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />

            {canonical && <meta property="og:url" content={canonical} />}

            <meta property="og:image" content={previewImage} />

            <meta property="og:site_name" content="Native Places" />
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={title} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={previewImage} />

            {structuredData && (
                <script type="application/ld+json">
                    {JSON.stringify(structuredData)}
                </script>
            )}
        </Helmet>
    );
}