import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { routesApi } from "../shared/api/routesApi";
import { openYandexRouteFromCurrentLocation } from "../shared/map/openYandexRoute";
import { Seo } from "../shared/seo/Seo";
import { NOINDEX_ROBOTS } from "../shared/seo/seoConfig";

import "./RoutePage.css";

export function RoutePage() {
    const { id } = useParams();

    const [route, setRoute] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [shareMessage, setShareMessage] = useState("");
    const seo = (
        <Seo
            title={route?.title
                ? `${route.title} — личный маршрут | Native Places`
                : "Личный маршрут | Native Places"}
            description="Личный маршрут пользователя Native Places."
            robots={NOINDEX_ROBOTS}
        />
    );

    useEffect(() => {
        let isMounted = true;

        async function fetchRoute() {
            try {
                const data = await routesApi.getRoute(id);

                if (!isMounted) {
                    return;
                }

                setRoute(data.route);
                setError("");
            } catch (error) {
                console.error(error);

                if (isMounted) {
                    setError(error.message || "Не удалось загрузить маршрут.");
                    setRoute(null);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        fetchRoute();

        return () => {
            isMounted = false;
        };
    }, [id]);

    async function handleRemovePlace(routePlaceId) {
        const isConfirmed = window.confirm("Удалить объект из маршрута?");

        if (!isConfirmed) {
            return;
        }

        try {
            await routesApi.removePlaceFromRoute(routePlaceId);

            setRoute((currentRoute) => ({
                ...currentRoute,
                places: currentRoute.places.filter((place) => {
                    return String(place.routePlaceId) !== String(routePlaceId);
                }),
            }));
        } catch (error) {
            console.error(error);

            window.alert(error.message || "Не удалось удалить объект из маршрута.");
        }
    }

    if (loading) {
        return (
            <>
                {seo}
                <main className="route-page">
                    <section className="route-page__card">
                        <p>Загружаем маршрут...</p>
                    </section>
                </main>
            </>
        );
    }

    if (error || !route) {
        return (
            <>
                {seo}
                <main className="route-page">
                    <section className="route-page__card">
                        <Link className="route-page__back" to="/account">
                            ← В кабинет
                        </Link>

                        <h1>Маршрут не найден</h1>

                        <p>{error || "Такого маршрута нет или доступ закрыт."}</p>
                    </section>
                </main>
            </>
        );
    }

    async function handleShareRoute() {
        if (!route.shareToken) {
            setShareMessage("У маршрута нет ссылки для общего доступа");
            return;
        }

        try {
            let nextRoute = route;
            const wasPrivate = !route.isPublic;

            if (wasPrivate) {
                await routesApi.updateRoute({
                    routeId: route.id,
                    title: route.title,
                    description: route.description,
                    isPublic: true,
                });

                nextRoute = {
                    ...route,
                    isPublic: true,
                };

                setRoute(nextRoute);
            }

            const shareUrl =
                `${window.location.origin}/routes/share/${nextRoute.shareToken}`;

            await navigator.clipboard.writeText(shareUrl);

            setShareMessage(
                wasPrivate
                    ? "Маршрут открыт по ссылке, ссылка скопирована"
                    : "Ссылка скопирована"
            );

            setTimeout(() => {
                setShareMessage("");
            }, 3000);
        } catch (error) {
            console.error(error);

            setShareMessage("Не удалось скопировать ссылку");
        }
    }

    return (
        <>
            {seo}
            <main className="route-page">
            <section className="route-page__card">
                <Link className="route-page__back" to="/account">
                    ← В кабинет
                </Link>

                <div className="route-page__header">
                    <div>
                        <p className="route-page__eyebrow">
                            {route.isPublic ? "Публичный маршрут" : "Личный маршрут"}
                        </p>

                        <h1>{route.title}</h1>

                        {route.description && (
                            <p className="route-page__description">
                                {route.description}
                            </p>
                        )}
                    </div>

                    <div className="route-page__header-actions">
                        {route.places.length > 0 && (
                            <button
                                className="route-page__button"
                                type="button"
                                onClick={() => openYandexRouteFromCurrentLocation(route.places)}
                            >
                                Построить маршрут
                            </button>
                        )}

                        <button
                            className="route-page__button route-page__button--secondary"
                            type="button"
                            onClick={handleShareRoute}
                        >
                            Поделиться маршрутом
                        </button>

                        {shareMessage && (
                            <span className="route-page__share-message">
                                {shareMessage}
                            </span>
                        )}
                    </div>
                </div>

                {route.places.length === 0 ? (
                    <div className="route-page__empty">
                        <h2>В маршруте пока нет объектов</h2>

                        <p>
                            Откройте карточку объекта и нажмите «Добавить в маршрут».
                        </p>

                        <Link className="route-page__button" to="/map">
                            Перейти к карте
                        </Link>
                    </div>
                ) : (
                    <div className="route-page__places">
                        {route.places.map((place, index) => (
                            <article className="route-page__place" key={place.routePlaceId}>
                                <div className="route-page__place-number">
                                    {index + 1}
                                </div>

                                {place.image && (
                                    <img
                                        className="route-page__place-image"
                                        src={place.image}
                                        alt={place.title}
                                    />
                                )}

                                <div className="route-page__place-content">
                                    <p>{place.categoryTitle}</p>

                                    <h2>{place.title}</h2>

                                    {place.shortDescription && (
                                        <span>{place.shortDescription}</span>
                                    )}

                                    {place.address && (
                                        <strong>{place.address}</strong>
                                    )}

                                    <div className="route-page__place-actions">
                                        <Link
                                            className="route-page__small-button"
                                            to={`/place/${place.slug}`}
                                        >
                                            Открыть
                                        </Link>

                                        <button
                                            className="route-page__small-button route-page__small-button--danger"
                                            type="button"
                                            onClick={() => handleRemovePlace(place.routePlaceId)}
                                        >
                                            Удалить
                                        </button>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
            </main>
        </>
    );
}
