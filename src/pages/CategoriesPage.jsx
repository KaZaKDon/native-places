import { Link } from "react-router-dom";

import { categoryCards } from "../shared/config/categoryConfig";
import { Seo } from "../shared/seo/Seo";

import "./CategoriesPage.css";

export function CategoriesPage() {
    return (
        <>
            <Seo
                title="Категории объявлений — недвижимость, аренда, отдых, рыбалка и охота | Native Places"
                description="Категории Native Places: недвижимость, аренда, базы отдыха, рыбалка, охота и природные места. Выберите направление, изучите объявления и откройте объекты на карте."
                canonical="https://native-places.ru/categories"
                image="https://native-places.ru/images/categories/categories-bg.webp"
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