import { useState } from "react";
import { Link } from "react-router-dom";

import { getAccountPlaceStatus } from "../../lib/getAccountPlaceStatus";

function createAccountPlaceMapUrl(place) {
    const params = new URLSearchParams();

    if (place.categorySlug) {
        params.set("category", place.categorySlug);
    }

    if (place.id) {
        params.set("place", String(place.id));
    }

    const query = params.toString();

    return query ? `/map?${query}` : "/map";
}

export function AccountPlaceCard({
    place,
    onDelete,
    deleteLabel = "Удалить",
    onRestore,
    restoreLabel = "Восстановить",
    showEdit = true,
    showMap = true,
}) {
    const gallery =
        place.gallery?.length > 0
            ? place.gallery
            : place.image
                ? [place.image]
                : [];

    const [activeImageIndex, setActiveImageIndex] = useState(0);

    const description =
        place.shortDescription ||
        place.description ||
        "Описание пока не добавлено.";

    const activeImage = gallery[activeImageIndex];
    const mapUrl = createAccountPlaceMapUrl(place);

    function handlePrevImage() {
        setActiveImageIndex((currentIndex) => {
            if (currentIndex === 0) {
                return gallery.length - 1;
            }

            return currentIndex - 1;
        });
    }

    function handleNextImage() {
        setActiveImageIndex((currentIndex) => {
            if (currentIndex === gallery.length - 1) {
                return 0;
            }

            return currentIndex + 1;
        });
    }

    return (
        <article className="account-book-place">
            {activeImage && (
                <div className="account-book-place__gallery">
                    <img
                        className="account-book-place__image"
                        src={activeImage}
                        alt={place.title || "Фото места"}
                    />

                    {gallery.length > 1 && (
                        <>
                            <button
                                className="account-book-place__gallery-button account-book-place__gallery-button--prev"
                                type="button"
                                onClick={handlePrevImage}
                                aria-label="Предыдущее фото"
                            >
                                ‹
                            </button>

                            <button
                                className="account-book-place__gallery-button account-book-place__gallery-button--next"
                                type="button"
                                onClick={handleNextImage}
                                aria-label="Следующее фото"
                            >
                                ›
                            </button>

                            <div className="account-book-place__dots">
                                {gallery.map((image, index) => (
                                    <button
                                        className={
                                            index === activeImageIndex
                                                ? "account-book-place__dot account-book-place__dot--active"
                                                : "account-book-place__dot"
                                        }
                                        key={`${image}-${index}`}
                                        type="button"
                                        onClick={() =>
                                            setActiveImageIndex(index)
                                        }
                                        aria-label={`Открыть фото ${index + 1}`}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            <div className="account-book-place__header">
                <span className="account-book-place__category">
                    {place.categoryTitle || "Без категории"}
                </span>

                <span className="account-book-place__status">
                    {getAccountPlaceStatus(place.status)}
                </span>
            </div>

            <h2>{place.title || "Без названия"}</h2>

            <p>{description}</p>

            <div className="account-book-place__meta">
                <span>{place.address || "Локация не указана"}</span>
            </div>

            <div className="account-book-place__actions">
                {showEdit && (
                    <Link
                        className="account-book-place__action account-book-place__action--edit"
                        to={`/submit?edit=${place.id}`}
                    >
                        Редактировать
                    </Link>
                )}

                {showMap && (
                    <Link className="account-book-place__action" to={mapUrl}>
                        На карте
                    </Link>
                )}

                {onRestore && (
                    <button
                        className="account-book-place__action account-book-place__action--edit"
                        type="button"
                        onClick={() => onRestore(place.id)}
                    >
                        {restoreLabel}
                    </button>
                )}

                {onDelete && (
                    <button
                        className="account-book-place__action account-book-place__action--danger"
                        type="button"
                        onClick={() => onDelete(place.id)}
                    >
                        {deleteLabel}
                    </button>
                )}
            </div>
        </article>
    );
}