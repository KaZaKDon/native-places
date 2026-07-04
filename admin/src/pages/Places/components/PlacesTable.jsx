import { Link, useLocation } from "react-router-dom";
import { EmptyState } from "../../../components/EmptyState/EmptyState";
import { StatusBadge } from "../../../components/StatusBadge/StatusBadge";

export function PlacesTable({ places }) {
    const location = useLocation();

    if (!places.length) {
        return (
            <EmptyState className="places-empty">
                Объявлений в этом разделе пока нет.
            </EmptyState>
        );
    }

    return (
        <div className="places-table-wrap">
            <table className="places-table">
                <thead>
                    <tr>
                        <th>Объявление</th>
                        <th>Категория</th>
                        <th>Тип</th>
                        <th>Владелец</th>
                        <th>Статус</th>
                        <th>Дата</th>
                        <th>Действия</th>
                    </tr>
                </thead>

                <tbody>
                    {places.map((place) => (
                        <tr key={place.id}>
                            <td>
                                <div className="place-title-cell">
                                    <span className="place-id">#{place.id}</span>
                                    <strong>{place.title}</strong>
                                </div>
                            </td>

                            <td>{place.category}</td>
                            <td>{place.type}</td>
                            <td>{place.owner}</td>

                            <td>
                                <StatusBadge status={place.status} />
                            </td>

                            <td>{place.createdAt}</td>

                            <td>
                                <Link
                                    className="table-action"
                                    to={`/places/view/${place.id}`}
                                    state={{ from: location.pathname }}
                                >
                                    Открыть
                                </Link>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}