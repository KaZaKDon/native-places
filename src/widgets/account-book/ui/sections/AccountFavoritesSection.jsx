import { useEffect, useState } from "react";

import { favoritesApi } from "../../../../shared/api/favoritesApi";
import { AccountBookPager } from "../components/AccountBookPager";
import { AccountFavoriteCard } from "../components/AccountFavoriteCard";

export function AccountFavoritesSection() {
    const [favoritePlaces, setFavoritePlaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let isMounted = true;

        async function loadFavorites() {
            try {
                const data = await favoritesApi.getFavorites();

                if (!isMounted) {
                    return;
                }

                setFavoritePlaces(data.favorites);
                setError("");
            } catch (error) {
                console.error("Не удалось загрузить избранное:", error);

                if (isMounted) {
                    setFavoritePlaces([]);
                    setError(
                        error.message || "Не удалось загрузить избранное."
                    );
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        loadFavorites();

        return () => {
            isMounted = false;
        };
    }, []);

    async function handleRemoveFavorite(placeId) {
        try {
            await favoritesApi.toggleFavorite(placeId);

            setFavoritePlaces((currentPlaces) =>
                currentPlaces.filter(
                    (place) => String(place.id) !== String(placeId)
                )
            );
        } catch (error) {
            console.error(error);

            window.alert(
                error.message || "Не удалось удалить объект из избранного."
            );
        }
    }

    if (loading) {
        return (
            <div className="account-book-section">
                <h1>Избранное</h1>
                <p>Загружаем избранные объекты...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="account-book-section">
                <h1>Избранное</h1>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="account-book-section">
            <h1>Избранное</h1>

            {favoritePlaces.length === 0 ? (
                <div className="account-book-empty">
                    <h2>Пока нет избранных мест</h2>

                    <p>
                        Откройте карточку объекта и нажмите «В избранное».
                    </p>
                </div>
            ) : (
                <AccountBookPager items={favoritePlaces}>
                    {(place) => (
                        <AccountFavoriteCard
                            place={place}
                            onRemove={handleRemoveFavorite}
                        />
                    )}
                </AccountBookPager>
            )}
        </div>
    );
}