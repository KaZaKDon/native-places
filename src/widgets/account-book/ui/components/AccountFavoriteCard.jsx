import { Link } from "react-router-dom";
import "./AccountFavoriteCard.css";

export function AccountFavoriteCard({ place, onRemove }) {
    return (
        <article className="account-favorite-card">
            <div className="account-favorite-card__image">
                {place.image ? (
                    <img src={place.image} alt={place.title} />
                ) : (
                    <span>Фото</span>
                )}
            </div>

            <div className="account-favorite-card__content">
                <span className="account-favorite-card__category">
                    {place.categoryTitle}
                </span>

                <h2>{place.title}</h2>

                <p>
                    {place.shortDescription || place.description || "Описание пока не добавлено."}
                </p>

                <div className="account-favorite-card__actions">
                    <Link
                        className="account-book-place__action"
                        to={`/place/${place.slug}`}
                    >
                        Открыть
                    </Link>

                    <button
                        className="account-book-place__action account-book-place__action--danger"
                        type="button"
                        onClick={() => onRemove(place.id)}
                    >
                        Удалить
                    </button>
                </div>
            </div>
        </article>
    );
}