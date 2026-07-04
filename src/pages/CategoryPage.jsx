import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { placesApi } from "../shared/api/placesApi";
import { categoryCards } from "../shared/config/categoryConfig";
import { createMapCategorySearchParams } from "../shared/map/categoryUrl";
import { Seo } from "../shared/seo/Seo";

import "./CategoryPage.css";

const SITE_URL = "https://native-places.ru";

const CATEGORY_SEO = {
    "real-estate": {
        eyebrow: "Недвижимость",
        h1: "Недвижимость",
        lead: "Дома, участки, дачи и загородные объекты рядом с водой, лесом и природными территориями.",
        text: "Раздел недвижимости помогает найти объекты для покупки, отдыха, переезда или инвестиций. Здесь могут размещаться дома, земельные участки, дачные предложения и другие объекты, связанные с жизнью за городом.",
        title: "Недвижимость у природы — дома, участки и загородные объекты | Native Places",
        description:
            "Недвижимость у природы: дома, участки, дачи и загородные объекты рядом с реками, озёрами, лесом и местами для отдыха. Смотрите объявления и расположение на карте.",
    },
    rent: {
        eyebrow: "Аренда",
        h1: "Аренда домов и помещений",
        lead: "Объявления об аренде домов, гостевых объектов, помещений и мест для временного проживания.",
        text: "В разделе аренды собраны предложения для отдыха, поездок, временного проживания и размещения на природе. Пользователь может выбрать объект, посмотреть описание, фотографии и перейти к карте.",
        title: "Аренда домов, помещений и мест для отдыха | Native Places",
        description:
            "Аренда домов, помещений, гостевых объектов и мест для отдыха на природе. Найдите вариант для поездки, временного проживания или остановки на несколько дней.",
    },
    recreation: {
        eyebrow: "Отдых",
        h1: "Базы отдыха и загородные места",
        lead: "Базы отдыха, туркомплексы, гостевые дома и места для отдыха на природе.",
        text: "Раздел подходит для поиска мест, где можно провести выходные, отпуск, семейную поездку или отдых у воды. Объявления помогают сравнить локации, условия, фотографии и контакты.",
        title: "Базы отдыха, гостевые дома и отдых на природе | Native Places",
        description:
            "Базы отдыха, гостевые дома, туркомплексы и загородные места для отдыха у воды, рядом с природными территориями, маршрутами, парками и заповедниками.",
    },
    fishing: {
        eyebrow: "Рыбалка",
        h1: "Места для рыбалки",
        lead: "Реки, водоёмы, берега, базы и объявления, связанные с рыбалкой и отдыхом у воды.",
        text: "В разделе рыбалки можно размещать и находить места для выезда к воде, рыболовные базы, участки, маршруты и предложения для любителей спокойного отдыха на природе.",
        title: "Рыбалка — места, водоёмы и рыболовные базы | Native Places",
        description:
            "Места для рыбалки, водоёмы, берега, рыболовные базы и объявления для отдыха у воды. Смотрите локации, маршруты и объекты рядом на карте.",
    },
    hunting: {
        eyebrow: "Охота",
        h1: "Охота и охотничьи направления",
        lead: "Охотничьи базы, территории, природные зоны и объявления для организованного выезда.",
        text: "Раздел охоты предназначен для объявлений, связанных с охотничьими территориями, базами, размещением и природными направлениями. Карточки помогают заранее изучить место и контакты.",
        title: "Охота — базы, территории и природные направления | Native Places",
        description:
            "Охотничьи базы, территории, размещение и природные направления для организованного выезда. Изучайте объявления, контакты и расположение объектов на карте.",
    },
    nature: {
        eyebrow: "Природа",
        h1: "Природные места и отдых",
        lead: "Озёра, степи, леса, берега, красивые локации и природные достопримечательности.",
        text: "Раздел природы объединяет места для прогулок, отдыха, поездок и знакомства с интересными природными территориями. Такие страницы полезны и для путешественников, и для владельцев объектов рядом с природой.",
        title: "Природные места, парки, заповедники и маршруты | Native Places",
        description:
            "Природные места, парки, заповедники, красивые локации и маршруты для поездок. Найдите места для отдыха, прогулок и путешествий рядом с объявлениями.",
    },
};

function createCategoryMapLink(categoryId) {
    const searchParams = createMapCategorySearchParams(categoryId);
    const search = searchParams.toString();

    return search ? `/map?${search}` : "/map";
}

function getCategorySeo(category) {
    const seo = CATEGORY_SEO[category.id];

    if (seo) {
        return seo;
    }

    return {
        eyebrow: category.title,
        h1: category.title,
        lead: category.description,
        text: category.description,
        title: `${category.title} | Native Places`,
        description: category.description,
    };
}

export function CategoryPage() {
    const { slug } = useParams();

    const category = useMemo(() => {
        return categoryCards.find((item) => item.id === slug) ?? null;
    }, [slug]);

    const [places, setPlaces] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const seo = category ? getCategorySeo(category) : null;

    useEffect(() => {
        let isMounted = true;

        async function loadPlaces() {
            if (!category) {
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                setErrorMessage("");

                const response = await placesApi.getPlaces({
                    category: category.id,
                });

                if (isMounted) {
                    setPlaces(response.places);
                }
            } catch (error) {
                if (isMounted) {
                    setErrorMessage(
                        error?.message || "Не удалось загрузить объявления"
                    );
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        loadPlaces();

        return () => {
            isMounted = false;
        };
    }, [category]);

    if (!category || !seo) {
        return (
            <>
                <Seo
                    title="Категория не найдена | Native Places"
                    description="Запрошенная категория объявлений не найдена на Native Places."
                    canonical={`${SITE_URL}/categories`}
                    image={`${SITE_URL}/images/logo/logo.png`}
                />

                <main className="category-page">
                    <div className="category-page__overlay" />

                    <section className="category-page__empty">
                        <p>Категория не найдена.</p>

                        <Link to="/categories">← Вернуться к категориям</Link>
                    </section>
                </main>
            </>
        );
    }

    return (
        <>
            <Seo
                title={seo.title}
                description={seo.description}
                canonical={`${SITE_URL}/category/${category.id}`}
                image={`${SITE_URL}/images/categories/cards/${category.id}.webp`}
            />

            <main className={`category-page category-page--${category.id}`}>
                <div className="category-page__overlay" />

                <header className="category-header">
                    <Link className="category-header__back" to="/categories">
                        ← Все категории
                    </Link>

                    <Link
                        className="category-header__map"
                        to={createCategoryMapLink(category.id)}
                    >
                        Показать на карте
                    </Link>
                </header>

                <section className="category-hero">
                    <p className="category-hero__eyebrow">{seo.eyebrow}</p>

                    <h1>{seo.h1}</h1>

                    <p className="category-hero__lead">{seo.lead}</p>

                    <div className="category-hero__actions">
                        <Link
                            className="category-hero__primary"
                            to={createCategoryMapLink(category.id)}
                        >
                            Смотреть на карте
                        </Link>

                        <Link className="category-hero__secondary" to="/submit">
                            Добавить объявление
                        </Link>
                    </div>
                </section>

                <section className="category-content">
                    <div className="category-info">
                        <h2>О разделе</h2>

                        <p>{seo.text}</p>
                    </div>

                    <div className="category-list">
                        <div className="category-list__header">
                            <h2>Объявления категории</h2>

                            <span>{places.length}</span>
                        </div>

                        {isLoading && (
                            <p className="category-list__state">
                                Загружаем объявления...
                            </p>
                        )}

                        {!isLoading && errorMessage && (
                            <p className="category-list__state category-list__state--error">
                                {errorMessage}
                            </p>
                        )}

                        {!isLoading && !errorMessage && places.length === 0 && (
                            <p className="category-list__state">
                                Пока в этой категории нет опубликованных объявлений.
                            </p>
                        )}

                        {!isLoading && !errorMessage && places.length > 0 && (
                            <div className="category-places">
                                {places.map((place) => (
                                    <Link
                                        key={place.id}
                                        className="category-place-card"
                                        to={`/place/${place.slug}`}
                                    >
                                        {place.image && (
                                            <img
                                                src={place.image}
                                                alt={place.title}
                                                loading="lazy"
                                            />
                                        )}

                                        <div className="category-place-card__body">
                                            <span>{place.typeTitle}</span>

                                            <h3>{place.title}</h3>

                                            {place.shortDescription && (
                                                <p>{place.shortDescription}</p>
                                            )}

                                            {place.address && (
                                                <small>{place.address}</small>
                                            )}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </>
    );
}