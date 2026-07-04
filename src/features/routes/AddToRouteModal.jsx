import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { routesApi } from "../../shared/api/routesApi";
import { useAuth } from "../../shared/auth/useAuth";

import "./AddToRouteModal.css";

export function AddToRouteModal({ place, onClose }) {
    const { isAuth } = useAuth();

    const [routes, setRoutes] = useState([]);
    const [selectedRouteId, setSelectedRouteId] = useState("");
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [status, setStatus] = useState("");

    useEffect(() => {
        let isMounted = true;

        if (!isAuth) {
            return () => {
                isMounted = false;
            };
        }

        async function fetchRoutes() {
            setLoading(true);
            setStatus("");

            try {
                const data = await routesApi.getRoutes();

                if (!isMounted) {
                    return;
                }

                setRoutes(data.routes);
                setSelectedRouteId(data.routes[0]?.id ? String(data.routes[0].id) : "");
            } catch (error) {
                console.error(error);

                if (isMounted) {
                    setStatus(error.message || "Не удалось загрузить маршруты.");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        fetchRoutes();

        return () => {
            isMounted = false;
        };
    }, [isAuth]);

    async function handleAddToRoute(event) {
        event.preventDefault();

        if (submitting) {
            return;
        }

        if (!isAuth) {
            setStatus("Чтобы добавить объект в маршрут, войдите в аккаунт.");
            return;
        }

        if (!selectedRouteId) {
            setStatus("Выберите маршрут.");
            return;
        }

        setSubmitting(true);
        setStatus("Добавляем объект в маршрут...");

        try {
            await routesApi.addPlaceToRoute({
                routeId: selectedRouteId,
                placeId: place.id,
            });

            setStatus("Объект добавлен в маршрут.");

            setTimeout(() => {
                onClose();
            }, 700);
        } catch (error) {
            console.error(error);
            setStatus(error.message || "Не удалось добавить объект в маршрут.");
            } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="add-route-modal" role="dialog" aria-modal="true">
            <div className="add-route-modal__card">
                <button
                    className="add-route-modal__close"
                    type="button"
                    onClick={onClose}
                    aria-label="Закрыть окно"
                >
                    ×
                </button>

                <p className="add-route-modal__eyebrow">Добавить в маршрут</p>

                <h2>{place.title}</h2>

                {!isAuth ? (
                    <div className="add-route-modal__empty">
                        <p>Чтобы добавить объект в маршрут, войдите в аккаунт.</p>
                        <Link to="/auth" onClick={onClose}>
                            Войти
                        </Link>
                    </div>
                ) : loading ? (
                    <div className="add-route-modal__empty">
                        <p>Загружаем ваши маршруты...</p>
                    </div>
                ) : routes.length === 0 ? (
                    <div className="add-route-modal__empty">
                        <p>
                            У вас пока нет маршрутов. Создайте маршрут в кабинете,
                            а затем добавьте сюда объект.
                        </p>
                        <Link to="/account?tab=routes" onClick={onClose}>
                            Создать маршрут
                        </Link>
                    </div>
                ) : (
                    <form className="add-route-form" onSubmit={handleAddToRoute}>
                        <label>
                            <span>Выберите маршрут</span>

                            <select
                                value={selectedRouteId}
                                onChange={(event) => {
                                    setSelectedRouteId(event.target.value);
                                    setStatus("");
                                }}
                            >
                                {routes.map((route) => (
                                    <option key={route.id} value={route.id}>
                                        {route.title}
                                    </option>
                                ))}
                            </select>
                        </label>

                        {status && (
                            <p className="add-route-modal__status">
                                {status}
                            </p>
                        )}

                        <button
                            className="add-route-form__submit"
                            type="submit"
                            disabled={submitting}
                        >
                            {submitting ? "Добавляем..." : "Добавить"}
                        </button>
                    </form>
                )}

                {(routes.length === 0 || loading || !isAuth) && status && (
                    <p className="add-route-modal__status">{status}</p>
                )}
            </div>
        </div>
    );
}