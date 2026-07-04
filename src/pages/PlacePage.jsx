import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getPlaceBySlug } from "../shared/api/placesApi";
import { createPlaceMapUrl } from "../entities/place/lib/createPlaceMapUrl";
import { createPlaceRouteUrl } from "../entities/place/lib/createPlaceRouteUrl";
import { getPlaceImages } from "../entities/place/lib/getPlaceImages";
import { conversationsApi } from "../shared/api/conversationsApi";
import { favoritesApi } from "../shared/api/favoritesApi";
import { reportsApi, REPORT_TYPES } from "../shared/api/reportsApi";
import { reviewsApi } from "../shared/api/reviewsApi";
import { useAuth } from "../shared/auth/useAuth";
import { AddToRouteModal } from "../features/routes/AddToRouteModal";

import { Seo } from "../shared/seo/Seo";
import "./PlacePage.css";

const PRIMARY_ATTRIBUTE_CODES = ["price", "area", "land_area", "rooms"];

function formatAttributeValue(attribute) {
    const value = attribute.value;

    if (!value) {
        return "";
    }

    if (attribute.fieldType === "boolean") {
        return value === "1" || value === "true" ? "Да" : "Нет";
    }

    if (attribute.code === "price") {
        const numberValue = Number(value);

        if (Number.isFinite(numberValue)) {
            return `${numberValue.toLocaleString("ru-RU")} ₽`;
        }

        return value;
    }

    if (attribute.code === "area") {
        return `${value} м²`;
    }

    if (attribute.code === "land_area") {
        return `${value} сот.`;
    }

    if (attribute.code === "rooms") {
        return `${value} комн.`;
    }

    return value;
}

function formatDate(value) {
    if (!value) {
        return "";
    }

    const date = new Date(value.replace(" ", "T"));

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
}

function getPrimaryAttributes(place) {
    return (place.attributes ?? []).filter((attribute) =>
        PRIMARY_ATTRIBUTE_CODES.includes(attribute.code)
    );
}

function getSecondaryAttributes(place) {
    return (place.attributes ?? []).filter(
        (attribute) => !PRIMARY_ATTRIBUTE_CODES.includes(attribute.code)
    );
}

export function PlacePage() {
    const { slug } = useParams();
    const { isAuth } = useAuth();

    const [place, setPlace] = useState(null);
    const [placeLoading, setPlaceLoading] = useState(true);
    const [placeError, setPlaceError] = useState("");

    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [viewerOpen, setViewerOpen] = useState(false);

    const [messageModalOpen, setMessageModalOpen] = useState(false);
    const [messageText, setMessageText] = useState("");
    const [messageStatus, setMessageStatus] = useState("");
    const [messageSending, setMessageSending] = useState(false);

    const [favorite, setFavorite] = useState(false);
    const [favoriteLoading, setFavoriteLoading] = useState(false);

    const [reviews, setReviews] = useState([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [reviewText, setReviewText] = useState("");
    const [reviewStatus, setReviewStatus] = useState("");
    const [reviewSending, setReviewSending] = useState(false);

    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [reportType, setReportType] = useState(REPORT_TYPES[0]?.value ?? "");
    const [reportText, setReportText] = useState("");
    const [reportStatus, setReportStatus] = useState("");
    const [reportSending, setReportSending] = useState(false);

    const [routeModalOpen, setRouteModalOpen] = useState(false);

    const images = place ? getPlaceImages(place) : [];

    const loadReviews = useCallback(async (placeId) => {
        setReviewsLoading(true);

        try {
            const data = await reviewsApi.getReviews(placeId);
            setReviews(data.reviews);
        } catch (error) {
            console.error("Не удалось загрузить отзывы:", error);
            setReviews([]);
        } finally {
            setReviewsLoading(false);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        async function loadPlace() {
            setPlaceLoading(true);

            try {
                const data = await getPlaceBySlug(slug);

                if (!isMounted) {
                    return;
                }

                if (!data.place) {
                    setPlace(null);
                    setPlaceError("Объект не найден.");
                    return;
                }

                setPlace(data.place);
                setPlaceError("");
                setActiveImageIndex(0);
                loadReviews(data.place.id);

                try {
                    const favoriteData = await favoritesApi.checkFavorite(
                        data.place.id
                    );

                    if (isMounted) {
                        setFavorite(Boolean(favoriteData.is_favorite));
                    }
                } catch (error) {
                    console.error("Не удалось проверить избранное:", error);

                    if (isMounted) {
                        setFavorite(false);
                    }
                }
            } catch (error) {
                console.error("Не удалось загрузить объект:", error);

                if (isMounted) {
                    setPlace(null);
                    setPlaceError(
                        error.message || "Не удалось загрузить объект."
                    );
                }
            } finally {
                if (isMounted) {
                    setPlaceLoading(false);
                }
            }
        }

        loadPlace();

        return () => {
            isMounted = false;
        };
    }, [slug, loadReviews]);

    const showPreviousImage = useCallback(() => {
        setActiveImageIndex((currentIndex) => {
            return currentIndex === 0 ? images.length - 1 : currentIndex - 1;
        });
    }, [images.length]);

    const showNextImage = useCallback(() => {
        setActiveImageIndex((currentIndex) => {
            return currentIndex === images.length - 1 ? 0 : currentIndex + 1;
        });
    }, [images.length]);

    useEffect(() => {
        if (!viewerOpen) {
            return undefined;
        }

        function handleKeyDown(event) {
            if (event.key === "Escape") {
                setViewerOpen(false);
            }

            if (event.key === "ArrowLeft") {
                showPreviousImage();
            }

            if (event.key === "ArrowRight") {
                showNextImage();
            }
        }

        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = "";
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [viewerOpen, showPreviousImage, showNextImage]);

    const primaryAttributes = useMemo(() => {
        return place ? getPrimaryAttributes(place) : [];
    }, [place]);

    const secondaryAttributes = useMemo(() => {
        return place ? getSecondaryAttributes(place) : [];
    }, [place]);

    function openViewer(index) {
        setActiveImageIndex(index);
        setViewerOpen(true);
    }

    function requireLoginMessage(action) {
        window.alert(`Чтобы ${action}, войдите в аккаунт.`);
    }

    async function handleToggleFavorite() {
        if (!place || favoriteLoading) {
            return;
        }

        if (!isAuth) {
            requireLoginMessage("добавить объект в избранное");
            return;
        }

        setFavoriteLoading(true);

        try {
            const result = await favoritesApi.toggleFavorite(place.id);
            setFavorite(Boolean(result.is_favorite));
        } catch (error) {
            console.error(error);
            window.alert(error.message || "Не удалось изменить избранное.");
        } finally {
            setFavoriteLoading(false);
        }
    }

    async function handleSendReview(event) {
        event.preventDefault();

        if (!place || reviewSending) {
            return;
        }

        if (!isAuth) {
            setReviewStatus("Чтобы оставить отзыв, войдите в аккаунт.");
            return;
        }

        const text = reviewText.trim();

        if (text.length < 10) {
            setReviewStatus("Отзыв должен быть не короче 10 символов.");
            return;
        }

        setReviewSending(true);
        setReviewStatus("");

        try {
            const result = await reviewsApi.createReview({
                placeId: place.id,
                text,
            });

            setReviewText("");
            setReviewStatus(result.message || "Отзыв опубликован.");
            loadReviews(place.id);
        } catch (error) {
            console.error(error);
            setReviewStatus(error.message || "Не удалось отправить отзыв.");
        } finally {
            setReviewSending(false);
        }
    }

    async function handleSendReport(event) {
        event.preventDefault();

        if (!place || reportSending) {
            return;
        }

        if (!isAuth) {
            setReportStatus("Чтобы отправить жалобу, войдите в аккаунт.");
            return;
        }

        const text = reportText.trim();

        if (!reportType) {
            setReportStatus("Выберите тип жалобы.");
            return;
        }

        if (!text) {
            setReportStatus("Опишите причину жалобы.");
            return;
        }

        setReportSending(true);
        setReportStatus("");

        try {
            const result = await reportsApi.createReport({
                placeId: place.id,
                reportType,
                message: text,
            });

            setReportText("");
            setReportStatus(result.message || "Жалоба отправлена.");

            setTimeout(() => {
                setReportModalOpen(false);
                setReportStatus("");
            }, 900);
        } catch (error) {
            console.error(error);
            setReportStatus(error.message || "Не удалось отправить жалобу.");
        } finally {
            setReportSending(false);
        }
    }

    async function handleSendMessage() {
        if (!place || messageSending) {
            return;
        }

        if (!isAuth) {
            setMessageStatus("Чтобы написать автору, войдите в аккаунт.");
            return;
        }

        const text = messageText.trim();

        if (!text) {
            setMessageStatus("Введите текст сообщения.");
            return;
        }

        setMessageSending(true);
        setMessageStatus("Отправляем сообщение...");

        try {
            const conversation = await conversationsApi.startConversation(
                place.id
            );

            if (!conversation.conversationId) {
                setMessageStatus("Не удалось создать диалог.");
                return;
            }

            await conversationsApi.sendMessage({
                conversationId: conversation.conversationId,
                text,
            });

            setMessageText("");
            setMessageStatus("Сообщение отправлено автору.");

            setTimeout(() => {
                setMessageModalOpen(false);
                setMessageStatus("");
            }, 1000);
        } catch (error) {
            console.error(error);
            setMessageStatus(error.message || "Не удалось отправить сообщение.");
        } finally {
            setMessageSending(false);
        }
    }

    if (placeLoading) {
        return (
            <main className="place-page place-page--not-found">
                <section className="place-page__not-found">
                    <p className="place-page__eyebrow">Загрузка</p>
                    <h1>Загружаем объект</h1>
                    <p>Получаем данные из базы.</p>
                </section>
            </main>
        );
    }

    if (!place) {
        return (
            <main className="place-page place-page--not-found">
                <section className="place-page__not-found">
                    <p className="place-page__eyebrow">Место не найдено</p>
                    <h1>Такого объекта пока нет</h1>
                    <p>
                        {placeError ||
                            "Возможно, ссылка устарела или объект еще не добавлен в базу."}
                    </p>

                    <Link className="place-page__button" to="/map">
                        Вернуться к карте
                    </Link>
                </section>
            </main>
        );
    }

    const locationTitle = place.localityTitle ||
        (place.locality && place.locality !== place.address ? place.locality : "");
    const locationParts = Array.from(
        new Set(
            [locationTitle, place.localityDistrict, place.localityRegion].filter(
                Boolean
            )
        )
    );
    const locationLabel = locationParts.join(", ");
    const addressLabel = place.address && place.address !== locationLabel
        ? place.address
        : "";

    const tags = Array.from(
        new Set(
            [locationTitle, place.typeTitle, place.categoryTitle].filter(
                Boolean
            )
        )
    );

    const routeUrl = createPlaceRouteUrl(place);
    const pageTitle = `${place.title} | Native Places`;

    const pageDescription =
        place.shortDescription ||
        place.fullDescription ||
        place.description ||
        `${place.categoryTitle}. ${place.address || ""}`;

    const pageImage =
        images.length > 0
            ? images[0]
            : "https://native-places.ru/images/logo/logo.png";

    const placeStructuredData = {
        "@context": "https://schema.org",
        "@type": "Place",
        name: place.title,
        description: pageDescription,
        url: `https://native-places.ru/place/${place.slug}`,
        image: pageImage,
        address: place.address || place.locality || undefined,
        category: place.categoryTitle || undefined,
        additionalType: place.typeTitle || undefined,
        geo: place.position
            ? {
                "@type": "GeoCoordinates",
                latitude: place.position[0],
                longitude: place.position[1],
            }
            : undefined,
        additionalProperty: (place.attributes ?? []).map((attribute) => ({
            "@type": "PropertyValue",
            name: attribute.title,
            value: formatAttributeValue(attribute),
        })),
    };

    return (
        <>
            <Seo
                title={pageTitle}
                description={pageDescription}
                canonical={`https://native-places.ru/place/${place.slug}`}
                image={pageImage}
                structuredData={placeStructuredData}
            />
            <main className="place-page">
                <section className="place-hero">
                    <div className="place-hero__image">
                        {images.length > 0 ? (
                            <div className="place-hero__gallery">
                                <div className="place-hero__main">
                                    <button
                                        className="place-hero__image-button"
                                        type="button"
                                        onClick={() => openViewer(activeImageIndex)}
                                    >
                                        <img
                                            src={images[activeImageIndex]}
                                            alt={`${place.title} — фото ${activeImageIndex + 1
                                                }`}
                                        />
                                    </button>

                                    {images.length > 1 && (
                                        <>
                                            <button
                                                className="place-hero__arrow place-hero__arrow--prev"
                                                type="button"
                                                onClick={showPreviousImage}
                                                aria-label="Предыдущее фото"
                                            >
                                                ‹
                                            </button>

                                            <button
                                                className="place-hero__arrow place-hero__arrow--next"
                                                type="button"
                                                onClick={showNextImage}
                                                aria-label="Следующее фото"
                                            >
                                                ›
                                            </button>

                                            <div className="place-hero__counter">
                                                {activeImageIndex + 1} /{" "}
                                                {images.length}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {images.length > 1 && (
                                    <div
                                        className="place-hero__thumbs"
                                        aria-label="Фотографии объекта"
                                    >
                                        {images.map((image, index) => (
                                            <button
                                                key={`${image}-${index}`}
                                                className={
                                                    index === activeImageIndex
                                                        ? "place-hero__thumb is-active"
                                                        : "place-hero__thumb"
                                                }
                                                type="button"
                                                onClick={() =>
                                                    setActiveImageIndex(index)
                                                }
                                                aria-label={`Показать фото ${index + 1
                                                    }`}
                                            >
                                                <img
                                                    src={image}
                                                    alt={`${place.title} — миниатюра ${index + 1
                                                        }`}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="place-hero__placeholder">
                                Фото объекта
                            </div>
                        )}
                    </div>

                    <div className="place-hero__content">
                        <div className="place-page__topbar">
                            <Link
                                className="place-page__back"
                                to={createPlaceMapUrl(place)}
                            >
                                ← Вернуться к карте
                            </Link>

                            <button
                                className="place-page__message-button"
                                type="button"
                                onClick={() => setMessageModalOpen(true)}
                            >
                                Сообщение автору
                            </button>
                        </div>

                        <p className="place-page__eyebrow">
                            {place.categoryTitle}
                        </p>

                        <h1>{place.title}</h1>

                        {primaryAttributes.length > 0 && (
                            <div className="place-page__summary">
                                {primaryAttributes.map((attribute) => (
                                    <span
                                        className="place-page__summary-item"
                                        key={attribute.id || attribute.code}
                                    >
                                        {formatAttributeValue(attribute)}
                                    </span>
                                ))}
                            </div>
                        )}

                        {(locationLabel || addressLabel) && (
                            <div className="place-page__location">
                                {locationLabel && (
                                    <div className="place-page__location-row">
                                        <span>Населённый пункт</span>
                                        <strong>{locationLabel}</strong>
                                    </div>
                                )}

                                {addressLabel && (
                                    <div className="place-page__location-row">
                                        <span>Адрес или ориентир</span>
                                        <p>{addressLabel}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {(place.fullDescription || place.description) && (
                            <p className="place-hero__lead">
                                {place.fullDescription || place.description}
                            </p>
                        )}

                        {secondaryAttributes.length > 0 && (
                            <section className="place-page__attributes">
                                <h2>Характеристики объекта</h2>

                                <div className="place-page__attributes-scroll">
                                    <dl>
                                        {secondaryAttributes.map((attribute) => (
                                            <div
                                                className="place-page__attribute-row"
                                                key={attribute.id || attribute.code}
                                            >
                                                <dt>{attribute.title}</dt>
                                                <dd>
                                                    {formatAttributeValue(
                                                        attribute
                                                    )}
                                                </dd>
                                            </div>
                                        ))}
                                    </dl>
                                </div>
                            </section>
                        )}

                        {tags.length > 0 && (
                            <div
                                className="place-page__tags"
                                aria-label="Метки объекта"
                            >
                                {tags.map((tag) => (
                                    <span className="place-page__tag" key={tag}>
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="place-page__actions">
                            <button
                                className={
                                    favorite
                                        ? "place-page__favorite place-page__favorite--active"
                                        : "place-page__favorite"
                                }
                                type="button"
                                onClick={handleToggleFavorite}
                                disabled={favoriteLoading}
                            >
                                {favorite ? "♥ В избранном" : "♡ В избранное"}
                            </button>

                            <button
                                className="place-page__button place-page__button--complaint"
                                type="button"
                                onClick={() => setReportModalOpen(true)}
                            >
                                Пожаловаться
                            </button>

                            <Link
                                className="place-page__button"
                                to={createPlaceMapUrl(place)}
                            >
                                Открыть на карте
                            </Link>

                            {routeUrl && (
                                <a
                                    className="place-page__button place-page__button--route"
                                    href={routeUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Построить маршрут
                                </a>
                            )}

                            <Link
                                className="place-page__button place-page__button--ghost"
                                to="/categories"
                            >
                                Все категории
                            </Link>
                        </div>

                        <div className="place-page__route-add">
                            <button
                                className="place-page__button place-page__button--add-route"
                                type="button"
                                onClick={() => setRouteModalOpen(true)}
                            >
                                Добавить в маршрут
                            </button>
                        </div>
                    </div>
                </section>

                <section className="place-reviews" id="reviews">
                    <div className="place-reviews__header">
                        <div>
                            <p className="place-page__eyebrow">Отзывы</p>
                            <h2>Отзывы об объекте</h2>
                        </div>
                        <span>{reviews.length}</span>
                    </div>

                    <form className="place-review-form" onSubmit={handleSendReview}>
                        <textarea
                            rows="4"
                            value={reviewText}
                            placeholder="Расскажите, что знаете об этом месте."
                            onChange={(event) => {
                                setReviewText(event.target.value);
                                setReviewStatus("");
                            }}
                        />

                        <div className="place-review-form__footer">
                            {reviewStatus && <p>{reviewStatus}</p>}

                            <button
                                className="place-page__button"
                                type="submit"
                                disabled={reviewSending}
                            >
                                {reviewSending ? "Отправляем..." : "Оставить отзыв"}
                            </button>
                        </div>
                    </form>

                    {reviewsLoading ? (
                        <p className="place-reviews__empty">Загружаем отзывы...</p>
                    ) : reviews.length > 0 ? (
                        <div className="place-reviews__list">
                            {reviews.map((review) => (
                                <article
                                    className="place-review-card"
                                    key={review.id}
                                >
                                    <div className="place-review-card__avatar">
                                        {review.userAvatar ? (
                                            <img
                                                src={review.userAvatar}
                                                alt={review.userName}
                                            />
                                        ) : (
                                            review.userName
                                                .slice(0, 1)
                                                .toUpperCase()
                                        )}
                                    </div>

                                    <div>
                                        <div className="place-review-card__top">
                                            <strong>{review.userName}</strong>
                                            {review.createdAt && (
                                                <span>
                                                    {formatDate(review.createdAt)}
                                                </span>
                                            )}
                                        </div>
                                        <p>{review.text}</p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <p className="place-reviews__empty">
                            Отзывов пока нет. Можно быть первым.
                        </p>
                    )}
                </section>

                {viewerOpen && images.length > 0 && (
                    <div className="image-viewer" role="dialog" aria-modal="true">
                        <button
                            className="image-viewer__close"
                            type="button"
                            onClick={() => setViewerOpen(false)}
                            aria-label="Закрыть просмотр"
                        >
                            ×
                        </button>

                        {images.length > 1 && (
                            <button
                                className="image-viewer__arrow image-viewer__arrow--prev"
                                type="button"
                                onClick={showPreviousImage}
                                aria-label="Предыдущее фото"
                            >
                                ‹
                            </button>
                        )}

                        <img
                            className="image-viewer__image"
                            src={images[activeImageIndex]}
                            alt={`${place.title} — фото ${activeImageIndex + 1}`}
                        />

                        {images.length > 1 && (
                            <button
                                className="image-viewer__arrow image-viewer__arrow--next"
                                type="button"
                                onClick={showNextImage}
                                aria-label="Следующее фото"
                            >
                                ›
                            </button>
                        )}

                        <div className="image-viewer__counter">
                            {activeImageIndex + 1} / {images.length}
                        </div>
                    </div>
                )}

                {messageModalOpen && (
                    <div className="message-modal" role="dialog" aria-modal="true">
                        <div className="message-modal__card">
                            <button
                                className="message-modal__close"
                                type="button"
                                onClick={() => setMessageModalOpen(false)}
                                aria-label="Закрыть окно"
                            >
                                ×
                            </button>

                            <p className="place-page__eyebrow">
                                Сообщение автору
                            </p>

                            <h2>{place.title}</h2>

                            <div className="message-chat">
                                <div className="message-chat__row message-chat__row--author">
                                    <div className="message-chat__avatar">А</div>

                                    <div className="message-chat__bubble">
                                        <strong>Автор объявления</strong>
                                        <p>Задайте вопрос по этому объекту.</p>
                                    </div>
                                </div>

                                <div className="message-chat__row message-chat__row--user">
                                    <div className="message-chat__bubble message-chat__bubble--input">
                                        <strong>Вы</strong>

                                        <textarea
                                            rows="5"
                                            value={messageText}
                                            placeholder="Здравствуйте! Подскажите, объявление актуально?"
                                            onChange={(event) => {
                                                setMessageText(event.target.value);
                                                setMessageStatus("");
                                            }}
                                        />

                                        {messageStatus && (
                                            <p className="message-modal__status">
                                                {messageStatus}
                                            </p>
                                        )}
                                    </div>

                                    <div className="message-chat__avatar message-chat__avatar--user">
                                        Я
                                    </div>
                                </div>
                            </div>

                            <button
                                className="place-page__button message-modal__submit"
                                type="button"
                                onClick={handleSendMessage}
                                disabled={messageSending}
                            >
                                {messageSending ? "Отправляем..." : "Отправить"}
                            </button>
                        </div>
                    </div>
                )}

                {reportModalOpen && (
                    <div className="message-modal" role="dialog" aria-modal="true">
                        <form
                            className="message-modal__card"
                            onSubmit={handleSendReport}
                        >
                            <button
                                className="message-modal__close"
                                type="button"
                                onClick={() => setReportModalOpen(false)}
                                aria-label="Закрыть окно"
                            >
                                ×
                            </button>

                            <p className="place-page__eyebrow">Жалоба</p>
                            <h2>Сообщить о проблеме</h2>

                            <div className="report-form">
                                <label>
                                    <span>Тип жалобы</span>
                                    <select
                                        value={reportType}
                                        onChange={(event) => {
                                            setReportType(event.target.value);
                                            setReportStatus("");
                                        }}
                                    >
                                        {REPORT_TYPES.map((type) => (
                                            <option
                                                key={type.value}
                                                value={type.value}
                                            >
                                                {type.title}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label>
                                    <span>Комментарий</span>
                                    <textarea
                                        rows="5"
                                        value={reportText}
                                        placeholder="Опишите, что не так с объявлением."
                                        onChange={(event) => {
                                            setReportText(event.target.value);
                                            setReportStatus("");
                                        }}
                                    />
                                </label>

                                {reportStatus && (
                                    <p className="message-modal__status">
                                        {reportStatus}
                                    </p>
                                )}
                            </div>

                            <button
                                className="place-page__button message-modal__submit"
                                type="submit"
                                disabled={reportSending}
                            >
                                {reportSending
                                    ? "Отправляем..."
                                    : "Отправить жалобу"}
                            </button>
                        </form>
                    </div>
                )}

                {routeModalOpen && (
                    <AddToRouteModal
                        place={place}
                        onClose={() => setRouteModalOpen(false)}
                    />
                )}
            </main>
        </>
    );
}