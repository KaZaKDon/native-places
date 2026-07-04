import { useEffect, useState } from "react";

import { myPlacesApi } from "../../../../shared/api/myPlacesApi";
import { routesApi } from "../../../../shared/api/routesApi";
import { AccountBookPager } from "../components/AccountBookPager";
import { AccountPlaceCard } from "../components/AccountPlaceCard";
import { AccountRouteCard } from "../components/AccountRouteCard";

export function AccountArchiveSection() {
    const [archiveView, setArchiveView] = useState("routes");

    const [routes, setRoutes] = useState([]);
    const [routesLoading, setRoutesLoading] = useState(false);
    const [routesError, setRoutesError] = useState("");

    const [places, setPlaces] = useState([]);
    const [placesLoading, setPlacesLoading] = useState(false);
    const [placesError, setPlacesError] = useState("");

    useEffect(() => {
        if (archiveView !== "routes") {
            return;
        }

        let isMounted = true;

        async function loadArchivedRoutes() {
            setRoutesLoading(true);
            setRoutesError("");

            try {
                const data = await routesApi.getArchivedRoutes();

                if (!isMounted) {
                    return;
                }

                setRoutes(data.routes);
            } catch (error) {
                console.error("Не удалось загрузить архив маршрутов:", error);

                if (isMounted) {
                    setRoutes([]);
                    setRoutesError(
                        error.message || "Не удалось загрузить архив маршрутов."
                    );
                }
            } finally {
                if (isMounted) {
                    setRoutesLoading(false);
                }
            }
        }

        loadArchivedRoutes();

        return () => {
            isMounted = false;
        };
    }, [archiveView]);

    useEffect(() => {
        if (archiveView !== "places") {
            return;
        }

        let isMounted = true;

        async function loadArchivedPlaces() {
            setPlacesLoading(true);
            setPlacesError("");

            try {
                const data = await myPlacesApi.getMyPlaces();

                if (!isMounted) {
                    return;
                }

                setPlaces(
                    data.places.filter((place) => place.status === "expired")
                );
            } catch (error) {
                console.error("Не удалось загрузить архив объявлений:", error);

                if (isMounted) {
                    setPlaces([]);
                    setPlacesError(
                        error.message || "Не удалось загрузить архив объявлений."
                    );
                }
            } finally {
                if (isMounted) {
                    setPlacesLoading(false);
                }
            }
        }

        loadArchivedPlaces();

        return () => {
            isMounted = false;
        };
    }, [archiveView]);

    async function handleDeleteRoute(routeId) {
        const isConfirmed = window.confirm("Удалить маршрут из архива навсегда?");

        if (!isConfirmed) {
            return;
        }

        try {
            await routesApi.deleteRoute(routeId);

            setRoutes((currentRoutes) =>
                currentRoutes.filter(
                    (route) =>
                        String(route.id) !== String(routeId)
                )
            );
        } catch (error) {
            console.error(error);

            window.alert(
                error.message || "Не удалось удалить маршрут из архива."
            );
        }
    }

    async function handleRestoreRoute(routeId) {
        try {
            await routesApi.restoreRoute(routeId);

            setRoutes((currentRoutes) =>
                currentRoutes.filter(
                    (route) =>
                        String(route.id) !== String(routeId)
                )
            );
        } catch (error) {
            console.error(error);

            window.alert(
                error.message || "Не удалось восстановить маршрут."
            );
        }
    }


    async function handleRestorePlace(placeId) {
        try {
            await myPlacesApi.restoreMyPlace(placeId);

            setPlaces((currentPlaces) =>
                currentPlaces.filter(
                    (place) => String(place.id) !== String(placeId)
                )
            );
        } catch (error) {
            console.error(error);

            window.alert(
                error.message || "Не удалось восстановить объявление."
            );
        }
    }

    async function handleRemovePlace(placeId) {
        const isConfirmed = window.confirm("Удалить объявление из архива навсегда?");

        if (!isConfirmed) {
            return;
        }

        try {
            await myPlacesApi.removeMyPlace(placeId);

            setPlaces((currentPlaces) =>
                currentPlaces.filter(
                    (place) => String(place.id) !== String(placeId)
                )
            );
        } catch (error) {
            console.error(error);

            window.alert(
                error.message || "Не удалось удалить объявление из архива."
            );
        }
    }

    function handleSelectRoutesArchive() {
        setArchiveView("routes");
    }

    function handleSelectPlacesArchive() {
        setArchiveView("places");
    }

    return (
        <div className="account-book-section">
            <h1>Архив</h1>

            <div className="account-contact-modal__tabs">
                <button
                    type="button"
                    className={archiveView === "routes" ? "is-active" : ""}
                    onClick={handleSelectRoutesArchive}
                >
                    Архив маршрутов
                </button>

                <button
                    type="button"
                    className={archiveView === "places" ? "is-active" : ""}
                    onClick={handleSelectPlacesArchive}
                >
                    Архив объявлений
                </button>
            </div>

            {archiveView === "routes" && (
                <>
                    {routesLoading && <p>Загружаем архив маршрутов...</p>}

                    {routesError && <p>{routesError}</p>}

                    {!routesLoading && !routesError && routes.length === 0 ? (
                        <div className="account-book-empty">
                            <h2>Архив маршрутов пуст</h2>

                            <p>
                                Завершённые маршруты будут сохраняться здесь
                                как история поездок и путешествий.
                            </p>
                        </div>
                    ) : (
                        !routesLoading &&
                        !routesError && (
                            <div className="account-book-section__body">
                                <AccountBookPager items={routes}>
                                    {(route) => (
                                        <div className="account-archive-route">
                                            <AccountRouteCard
                                                route={route}
                                                archiveLabel="Восстановить"
                                                onArchive={handleRestoreRoute}
                                            />

                                            <div className="account-archive-route__actions">
                                                <button
                                                    className="account-book-place__action account-book-place__action--danger"
                                                    type="button"
                                                    onClick={() => handleDeleteRoute(route.id)}
                                                >
                                                    Удалить из архива
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </AccountBookPager>
                            </div>
                        )
                    )}
                </>
            )}

            {archiveView === "places" && (
                <>
                    {placesLoading && <p>Загружаем архив объявлений...</p>}

                    {placesError && <p>{placesError}</p>}

                    {!placesLoading && !placesError && places.length === 0 ? (
                        <div className="account-book-empty">
                            <h2>Архив объявлений пуст</h2>

                            <p>
                                Здесь будут объекты, которые вы перенесли в архив.
                            </p>
                        </div>
                    ) : (
                        !placesLoading &&
                        !placesError && (
                            <div className="account-book-section__body">
                                <AccountBookPager items={places}>
                                    {(place) => (
                                        <AccountPlaceCard
                                            place={place}
                                            deleteLabel="Удалить из архива"
                                            restoreLabel="Восстановить"
                                            showEdit={false}
                                            showMap={false}
                                            onDelete={handleRemovePlace}
                                            onRestore={handleRestorePlace}
                                        />
                                    )}
                                </AccountBookPager>
                            </div>
                        )
                    )}
                </>
            )}
        </div>
    );
}