import { Helmet } from "react-helmet-async";

export function Seo({ title, description, canonical, image, structuredData }) {
    return (
        <Helmet>
            <title>{title}</title>

            <meta name="description" content={description} />

            {canonical && <link rel="canonical" href={canonical} />}

            <meta property="og:type" content="website" />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />

            {canonical && <meta property="og:url" content={canonical} />}

            {image && <meta property="og:image" content={image} />}

            <meta property="og:site_name" content="Native Places" />

            {structuredData && (
                <script type="application/ld+json">
                    {JSON.stringify(structuredData)}
                </script>
            )}
        </Helmet>
    );
}