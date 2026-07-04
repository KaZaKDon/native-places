import { Link } from "react-router-dom";

import { myPlacesApi } from "../../../../shared/api/myPlacesApi";
import { AccountBookPager } from "../components/AccountBookPager";
import { AccountPlaceCard } from "../components/AccountPlaceCard";

export function AccountPlacesSection({
    places = [],
    setPlaces,
    placesLoading = false,
}) {
    async function handleDeletePlace(placeId) {
        const isConfirmed = window.confirm("Переместить объявление в архив?");

        if (!isConfirmed) {
            return;
        }

        try {
            await myPlacesApi.deleteMyPlace(placeId);

            setPlaces((currentPlaces) =>
                currentPlaces.filter(
                    (place) => String(place.id) !== String(placeId)
                )
            );
        } catch (error) {
            console.error(error);

            window.alert(error.message || "Не удалось Переместить объявление в архив?");
        }
    }

    return (
        <div className="account-book-section">
            <h1>Мои места</h1>

            {placesLoading && <p>Загрузка объектов...</p>}

            {!placesLoading && places.length === 0 && (
                <p>Ваши объекты будут загружаться из базы данных.</p>
            )}

            <Link className="account-book-section__button" to="/submit">
                Добавить место
            </Link>

            {!placesLoading && places.length === 0 ? (
                <div className="account-book-empty">
                    <h2>Пока нет добавленных мест</h2>

                    <p>
                        Добавьте объект, выберите координаты на карте, и запись
                        появится здесь.
                    </p>
                </div>
            ) : (
                <AccountBookPager items={places}>
                    {(place) => (
                        <AccountPlaceCard
                            place={place}
                            onDelete={handleDeletePlace}
                            deleteLabel="В архив"
                        />
                    )}
                </AccountBookPager>
            )}
        </div>
    );
}