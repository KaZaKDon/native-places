import { Link } from "react-router-dom";
import { StatusBadge } from "../../../components/StatusBadge/StatusBadge";

export function UserPlaces({ places }) {
    return (
        <article className="user-section">
            <h3>Объявления пользователя</h3>

            <div className="user-places-list">
                {places.map((place) => (
                    <div key={place.id} className="user-place-item">
                        <div>
                            <span>#{place.id}</span>
                            <strong>{place.title}</strong>
                            <p>{place.category} · {place.createdAt}</p>
                        </div>

                        <div className="user-place-item__actions">
                            <StatusBadge status={place.status} />

                            <Link className="table-action" to={`/places/view/${place.id}`}>
                                Открыть
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </article>
    );
}