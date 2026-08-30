import { Link } from "react-router-dom";

import { Seo } from "../shared/seo/Seo";
import { useAuth } from "../shared/auth/useAuth";
import {
    DEFAULT_SEO_DESCRIPTION,
    DEFAULT_SEO_IMAGE,
    SITE_NAME,
    SITE_URL,
} from "../shared/seo/seoConfig";

import "./HomePage.css";

export function HomePage() {
    const { isAuth, authLoading } = useAuth();

    const accountButtonText = authLoading
        ? "Проверяем вход..."
        : isAuth
            ? "Кабинет"
            : "Войти / регистрация";

    const accountButtonLink = isAuth ? "/account" : "/auth";
    const structuredData = [
        {
            "@context": "https://schema.org",
            "@type": "Organization",
            "@id": `${SITE_URL}/#organization`,
            name: SITE_NAME,
            url: `${SITE_URL}/`,
            logo: `${SITE_URL}/images/logo/logo.png`,
        },
        {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "@id": `${SITE_URL}/#website`,
            name: SITE_NAME,
            alternateName: "Родные места",
            url: `${SITE_URL}/`,
            description: DEFAULT_SEO_DESCRIPTION,
            inLanguage: "ru-RU",
            publisher: {
                "@id": `${SITE_URL}/#organization`,
            },
        },
    ];

    return (
        <>
            <Seo
                title="Native Places — недвижимость, аренда, отдых, рыбалка и охота"
                description="Native Places объединяет недвижимость, аренду, базы отдыха, рыбалку, охоту и природный туризм. Найдите дом, участок, место для отдыха или путешествия, изучите карту, маршруты, природные парки и интересные локации рядом."
                canonical="/"
                image={DEFAULT_SEO_IMAGE}
                imageAlt="Native Places — недвижимость, отдых и родные места на карте"
                structuredData={structuredData}
            />

            <main className="home-page">
                <section className="hero">
                    <div className="hero__overlay" />

                    <header className="hero__header">
                        <Link
                            className="hero__brand"
                            to="/"
                            aria-label="Native Places"
                        >
                            <img
                                className="hero__brand-logo"
                                src="/images/logo/logo.png"
                                alt="Native Places"
                            />
                        </Link>

                        <nav className="hero__nav">
                            {authLoading ? (
                                <span className="hero__login hero__login--disabled">
                                    {accountButtonText}
                                </span>
                            ) : (
                                <Link
                                    className="hero__login"
                                    to={accountButtonLink}
                                >
                                    {accountButtonText}
                                </Link>
                            )}
                        </nav>
                    </header>

                    <div className="hero__content">
                        <div className="hero__text">
                            <h1 className="hero__title">
                                Родные места
                            </h1>

                            <p className="hero__subtitle">
                                Недвижимость, аренда, отдых, рыбалка и природа на одной карте.
                            </p>
                        </div>

                        <div className="hero__actions">
                            <Link
                                className="hero__button hero__button--primary"
                                to="/map"
                            >
                                Исследовать карту
                            </Link>

                            <Link
                                className="hero__button hero__button--secondary"
                                to="/categories"
                            >
                                Категории
                            </Link>
                        </div>
                    </div>
                </section>
            </main>
        </>
    );
}
