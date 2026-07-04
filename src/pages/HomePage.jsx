import { Link } from "react-router-dom";

import { Seo } from "../shared/seo/Seo";
import { useAuth } from "../shared/auth/useAuth";

import "./HomePage.css";

export function HomePage() {
    const { isAuth, authLoading } = useAuth();

    const accountButtonText = authLoading
        ? "Проверяем вход..."
        : isAuth
            ? "Кабинет"
            : "Войти / регистрация";

    const accountButtonLink = isAuth ? "/account" : "/auth";
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "Native Places",
        alternateName: "Родные места",
        url: "https://native-places.ru",
        description:
            "Платформа объявлений о недвижимости, аренде, отдыхе, рыбалке, охоте и природном туризме.",
        publisher: {
            "@type": "Organization",
            name: "VKazakDon Studio",
            url: "https://vkazakdon.ru",
        },
    };

    return (
        <>
            <Seo
                title="Native Places — недвижимость, аренда, отдых, рыбалка и охота"
                description="Native Places объединяет недвижимость, аренду, базы отдыха, рыбалку, охоту и природный туризм. Найдите дом, участок, место для отдыха или путешествия, изучите карту, маршруты, природные парки и интересные локации рядом."
                canonical="https://native-places.ru/"
                image="https://native-places.ru/images/logo/logo.png"
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