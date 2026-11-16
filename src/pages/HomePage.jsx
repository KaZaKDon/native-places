import { Link } from "react-router-dom";

import { categoryCards } from "../shared/config/categoryConfig";

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
                title="Native Places — объявления и справочник природных мест"
                description={DEFAULT_SEO_DESCRIPTION}
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
                                Сейчас проект развивается преимущественно в Ростовской области,
                                постепенно расширяя географию на другие регионы России.
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
                            <Link
                                className="hero__button hero__button--primary"
                                to="/directory"
                            >
                                Справочник
                            </Link>
                        </div>
                    </div>
                </section>

                <section className="home-discovery" aria-labelledby="home-discovery-title">
                    <div className="home-discovery__inner">
                        <p className="home-discovery__eyebrow">Откройте родные места</p>
                        <h2 id="home-discovery-title">Что можно найти на Native Places</h2>
                        <p className="home-discovery__lead">
                            Выбирайте объявления о недвижимости и аренде, базы отдыха,
                            места для рыбалки, охоты и природные локации.
                            Сейчас проект развивается преимущественно в Ростовской области;
                            другие регионы добавляются постепенно.
                        </p>
                        <div className="home-discovery__grid">
                            {categoryCards.map((category) => (
                                <Link
                                    key={category.id}
                                    className="home-discovery__card"
                                    to={`/category/${category.id}`}
                                >
                                    <h3>{category.title}</h3>
                                    <p>{category.description}</p>
                                    <span aria-hidden="true">Посмотреть →</span>
                                </Link>
                            ))}
                        </div>
                        <p className="home-discovery__footer">
                            Предпочитаете искать по расположению? <Link to="/map">Откройте карту мест</Link>
                            и используйте фильтры по категориям и населённым пунктам.
                            А <Link to="/directory">в справочнике</Link> доступны бесплатные описания рек и природных мест.
                        </p>
                    </div>
                </section>
            </main>
        </>
    );
}
