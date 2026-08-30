import { Link } from "react-router-dom";

import { categoryCards } from "../shared/config/categoryConfig";
import { Seo } from "../shared/seo/Seo";
import {
    SITE_URL,
    createBreadcrumbStructuredData,
} from "../shared/seo/seoConfig";

import "./CategoriesPage.css";

export function CategoriesPage() {
    const structuredData = [
        createBreadcrumbStructuredData([
            { name: "Главная", path: "/" },
            { name: "Категории", path: "/categories" },
        ]),
        {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "@id": `${SITE_URL}/categories#collection`,
            name: "Категории Native Places",
            url: `${SITE_URL}/categories`,
            inLanguage: "ru-RU",
            mainEntity: {
                "@type": "ItemList",
                itemListElement: categoryCards.map((category, index) => ({
                    "@type": "ListItem",
                    position: index + 1,
                    name: category.title,
                    url: `${SITE_URL}/category/${category.id}`,
                })),
            },
        },
    ];

    return (
        <>
            <Seo
                title="Категории мест и объявлений | Native Places"
                description="Категории Native Places: недвижимость, аренда, базы отдыха, рыбалка, охота и природные места. Выберите направление, изучите объявления и откройте объекты на карте."
                canonical="/categories"
                image="/images/categories/categories-bg.webp"
                imageAlt="Категории мест и объявлений Native Places"
                structuredData={structuredData}
            />

            <main className="categories-page">
                <div className="categories-page__overlay" />

                <header className="categories-header">
                    <Link className="categories-header__back" to="/">
                        ← На главную
                    </Link>

                    <Link className="categories-page__add-button" to="/submit">
                        Добавить место
                    </Link>

                    <Link className="categories-header__map" to="/map">
                        Открыть всю карту
                    </Link>
                </header>

                <section className="categories-hero">
                    <h1>Категории объявлений</h1>

                    <p>
                        Выберите направление: недвижимость, аренда, рыбалка, охота
                        или отдых на природе. Внутри категории можно посмотреть
                        объявления списком или открыть их на карте.
                    </p>
                </section>

                <section className="category-board" aria-label="Категории">
                    {categoryCards.map((category, index) => (
                        <Link
                            key={category.id}
                            className={`category-card category-card--${category.id}`}
                            to={`/category/${category.id}`}
                            style={{
                                "--i": index,
                            }}
                        >
                            <h2>{category.title}</h2>

                            <p>{category.description}</p>
                        </Link>
                    ))}
                </section>
            </main>
        </>
    );
}
