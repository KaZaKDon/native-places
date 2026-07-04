import { Link } from "react-router-dom";

import "./AccountRouteCard.css";

function formatRouteDate(value) {
    if (!value) {
        return "Дата не указана";
    }

    return new Date(value).toLocaleDateString("ru-RU");
}

function createYandexRouteUrl(route) {
    const routePoints = (route.places ?? [])
        .filter((place) => Array.isArray(place.position) && place.position.length === 2)
        .map((place) => `${place.position[0]},${place.position[1]}`);

    if (routePoints.length === 0) {
        return "";
    }

    return `https://yandex.ru/maps/?rtext=${routePoints.join("~")}&rtt=auto`;
}

export function AccountRouteCard({
    route,
    onArchive,
    archiveLabel = "В архив",
}) {
    const yandexRouteUrl = createYandexRouteUrl(route);

    return (
        <article className="account-route-card">
            <div className="account-route-card__head">
                <span>{formatRouteDate(route.createdAt)}</span>
                <strong>{route.placesCount ?? route.places?.length ?? 0} мест</strong>
            </div>

            <h2>{route.title || "Без названия"}</h2>

            {route.description && (
                <p>{route.description}</p>
            )}

            {route.places?.length > 0 && (
                <div className="account-route-card__places">
                    {route.places.map((place, index) => (
                        <div className="account-route-card__place" key={place.id}>
                            {index + 1}. {place.title}
                        </div>
                    ))}
                </div>
            )}

            <div className="account-route-card__actions">
                <Link
                    className="account-book-place__action"
                    to={`/routes/${route.id}`}
                >
                    Открыть
                </Link>

                {yandexRouteUrl && (
                    <a
                        className="account-book-place__action"
                        href={yandexRouteUrl}
                        target="_blank"
                        rel="noreferrer"
                    >
                        Построить маршрут
                    </a>
                )}

                <button
                    className="account-book-place__action account-book-place__action--danger"
                    type="button"
                    onClick={() => onArchive(route.id)}
                >
                    {archiveLabel}
                </button>
            </div>
        </article>
    );
}