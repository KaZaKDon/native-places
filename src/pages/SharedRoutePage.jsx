import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { routesApi } from "../shared/api/routesApi";
import { openYandexRouteFromCurrentLocation } from "../shared/map/openYandexRoute";

import "./RoutePage.css";

export function SharedRoutePage() {
    const { token } = useParams();

    const [route, setRoute] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let isMounted = true;

        async function fetchRoute() {
            try {
                const data = await routesApi.getSharedRoute(token);

                if (!isMounted) {
                    return;
                }

                setRoute(data.route);
                setError("");
            } catch (error) {
                console.error(error);

                if (isMounted) {
                    setRoute(null);
                    setError(error.message || "Не удалось открыть маршрут.");
                }
            }
        }

        fetchRoute();

        return () => {
            isMounted = false;
        };
    }, [token]);

    if (error) {
        return (
            <main className="route-page">
                <section className="route-page__card">
                    <Link className="route-page__back" to="/">
                        ← На главную
                    </Link>

                    <h1>Маршрут не найден</h1>

                    <p>{error}</p>
                </section>
            </main>
        );
    }

    if (!route) {
        return (
            <main className="route-page">
                <section className="route-page__card">
                    <p>Загружаем маршрут...</p>
                </section>
            </main>
        );
    }

    return (
        <main className="route-page">
            <section className="route-page__card">
                <Link className="route-page__back" to="/">
                    ← На главную
                </Link>

                <div className="route-page__header">
                    <div>
                        <p className="route-page__eyebrow">
                            Публичный маршрут
                        </p>

                        <h1>{route.title}</h1>

                        {route.description && (
                            <p className="route-page__description">
                                {route.description}
                            </p>
                        )}
                    </div>

                    {route.places.length > 0 && (
                        <button
                            className="route-page__button"
                            type="button"
                            onClick={() =>
                                openYandexRouteFromCurrentLocation(route.places)
                            }
                        >
                            Построить маршрут
                        </button>
                    )}
                </div>

                {route.places.length === 0 ? (
                    <div className="route-page__empty">
                        <h2>В маршруте пока нет объектов</h2>

                        <p>Автор ещё не добавил объекты в этот маршрут.</p>
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
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}