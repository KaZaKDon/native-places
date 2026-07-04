import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { PlacesStatusTabs } from "./components/PlacesStatusTabs";
import { PlacesTable } from "./components/PlacesTable";
import { PlacesFilters } from "./components/PlacesFilters";

import { placesApi } from "../../shared/api/placesApi";
import { getPlaceCategories, mapPlaceFromApi } from "./utils/placesFilters";

import "./PlacesPage.css";

const STATUS_LABELS = {
    all: "Все",
    pending: "На модерации",
    published: "Опубликованные",
    rejected: "Отклонённые",
    expired: "Архив",
};

const STATUS_VALUES = ["all", "pending", "published", "rejected", "expired"];

export function PlacesPage() {
    const { status } = useParams();

    const currentStatus = status || "all";

    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("all");

    const [places, setPlaces] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        let isMounted = true;

        async function loadPlaces() {
            try {
                setIsLoading(true);
                setErrorMessage("");

                const data = await placesApi.getPlaces({
                    status: currentStatus,
                    q: search,
                });

                const mappedPlaces = (data.places || []).map(mapPlaceFromApi);

                if (isMounted) {
                    setPlaces(mappedPlaces);
                }
            } catch (error) {
                if (isMounted) {
                    setErrorMessage(error.message || "Не удалось загрузить объявления");
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        loadPlaces();

        return () => {
            isMounted = false;
        };
    }, [currentStatus, search]);

    const categories = useMemo(() => {
        return getPlaceCategories(places);
    }, [places]);

    const filteredPlaces = useMemo(() => {
        if (category === "all") {
            return places;
        }

        return places.filter((place) => place.category === category);
    }, [places, category]);

    const statusItems = useMemo(() => {
        return STATUS_VALUES.map((itemStatus) => ({
            value: itemStatus,
            label: STATUS_LABELS[itemStatus],
            count:
                itemStatus === currentStatus
                    ? filteredPlaces.length
                    : 0,
        }));
    }, [currentStatus, filteredPlaces.length]);

    function resetFilters() {
        setSearch("");
        setCategory("all");
    }

    return (
        <section className="page">
            <div className="page-header">
                <div>
                    <p className="eyebrow">Объявления</p>

                    <h2>Управление объявлениями</h2>

                    <p>
                        Реальные объявления, модерация, публикация,
                        отклонение и перенос в архив.
                    </p>
                </div>
            </div>

            {errorMessage ? (
                <div className="places-empty">
                    {errorMessage}
                </div>
            ) : null}

            <PlacesStatusTabs items={statusItems} />

            <PlacesFilters
                search={search}
                category={category}
                categories={categories}
                onSearchChange={setSearch}
                onCategoryChange={setCategory}
                onReset={resetFilters}
            />

            {isLoading ? (
                <div className="places-empty">
                    Загружаем объявления...
                </div>
            ) : (
                <PlacesTable places={filteredPlaces} />
            )}
        </section>
    );
}