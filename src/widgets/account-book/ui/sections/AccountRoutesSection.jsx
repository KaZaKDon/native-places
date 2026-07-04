import { useEffect, useState } from "react";

import { routesApi } from "../../../../shared/api/routesApi";
import { AccountBookPager } from "../components/AccountBookPager";
import { AccountRouteCard } from "../components/AccountRouteCard";
import { RouteCreateModal } from "../components/RouteCreateModal";

import "./AccountRoutesSection.css";

export function AccountRoutesSection() {
    const [routes, setRoutes] = useState([]);
    const [error, setError] = useState("");
    const [modalOpen, setModalOpen] = useState(false);

    useEffect(() => {
        let isMounted = true;

        async function fetchRoutes() {
            try {
                const data = await routesApi.getRoutes();

                if (!isMounted) {
                    return;
                }

                setRoutes(data.routes);
                setError("");
            } catch (error) {
                console.error(error);

                if (isMounted) {
                    setError(
                        error.message || "Не удалось загрузить маршруты."
                    );
                }
            }
        }

        fetchRoutes();

        return () => {
            isMounted = false;
        };
    }, []);

    async function handleCreateRoute(route) {
        try {
            const data = await routesApi.createRoute(route);

            setRoutes((currentRoutes) => [
                data.route,
                ...currentRoutes,
            ]);

            setModalOpen(false);
        } catch (error) {
            console.error(error);

            window.alert(
                error.message || "Не удалось создать маршрут."
            );
        }
    }

    async function handleArchiveRoute(routeId) {
        const isConfirmed = window.confirm(
            "Переместить маршрут в архив?"
        );

        if (!isConfirmed) {
            return;
        }

        try {
            await routesApi.archiveRoute(routeId);

            setRoutes((currentRoutes) =>
                currentRoutes.filter(
                    (route) =>
                        String(route.id) !== String(routeId)
                )
            );
        } catch (error) {
            console.error(error);

            window.alert(
                error.message || "Не удалось переместить маршрут в архив."
            );
        }
    }

    if (error) {
        return (
            <div className="account-book-section">
                <h1>Маршруты</h1>

                <p>{error}</p>

                <button
                    className="account-book-section__button account-routes__create"
                    type="button"
                    onClick={() => setModalOpen(true)}
                >
                    Создать маршрут
                </button>

                {modalOpen && (
                    <RouteCreateModal
                        onClose={() => setModalOpen(false)}
                        onCreate={handleCreateRoute}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="account-book-section">
            <h1>Маршруты</h1>

            <button
                className="account-book-section__button account-routes__create"
                type="button"
                onClick={() => setModalOpen(true)}
            >
                Создать маршрут
            </button>

            {routes.length === 0 ? (
                <div className="account-book-empty">
                    <h2>Создайте первый маршрут</h2>

                    <p>
                        Соберите список объектов и постройте маршрут между ними.
                    </p>
                </div>
            ) : (
                <div className="account-book-section__body">
                    <AccountBookPager items={routes}>
                        {(route) => (
                            <AccountRouteCard
                                route={route}
                                onArchive={handleArchiveRoute}
                            />
                        )}
                    </AccountBookPager>
                </div>
            )}

            {modalOpen && (
                <RouteCreateModal
                    onClose={() => setModalOpen(false)}
                    onCreate={handleCreateRoute}
                />
            )}
        </div>
    );
}