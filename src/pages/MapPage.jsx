import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { localitiesApi } from "../shared/api/localitiesApi";
import { placesApi } from "../shared/api/placesApi";
import { useMapState } from "../features/map-state/useMapState";
import { MapBottomSheet } from "../features/map-bottom-sheet/MapBottomSheet";
import { filterPlaces } from "../shared/map/filterPlaces";
import { useDebouncedValue } from "../shared/search/useDebouncedValue";
import { Seo } from "../shared/seo/Seo";
import { MapView } from "../widgets/MapView/MapView";
import { MapSidebar } from "../widgets/MapSidebar/MapSidebar";

import "./MapPage.css";

export function MapPage() {
    const [searchParams] = useSearchParams();

    const queryCategory = searchParams.get("category") || "";
    const queryPlaceId = searchParams.get("place") || "";

    const mapState = useMapState();
    const debouncedSearch = useDebouncedValue(mapState.search, 250);

    const [allPlaces, setAllPlaces] = useState([]);
    const [placesLoading, setPlacesLoading] = useState(true);
    const [placesError, setPlacesError] = useState("");
    const [activeLocalityInfo, setActiveLocalityInfo] = useState(null);

    useEffect(() => {
        let isMounted = true;

        async function loadMapPlaces() {
            try {
                setPlacesLoading(true);

                const data = await placesApi.getMapPlaces({
                    locality: mapState.locality,
                });
                let places = Array.isArray(data.places) ? data.places : [];

                if (mapState.locality && places.length === 0) {
                    const fallbackData = await placesApi.getMapPlaces();
                    places = Array.isArray(fallbackData.places) ? fallbackData.places : [];
                }

                if (!isMounted) {
                    return;
                }

                setAllPlaces(places);
                setPlacesError("");
            } catch (error) {
                console.error("Не удалось загрузить объекты карты:", error);

                if (isMounted) {
                    setAllPlaces([]);
                    setPlacesError(
                        error.message || "Не удалось загрузить объекты карты."
                    );
                }
            } finally {
                if (isMounted) {
                    setPlacesLoading(false);
                }
            }
        }

        loadMapPlaces();

        return () => {
            isMounted = false;
        };
    }, [mapState.locality]);

    useEffect(() => {
        let isMounted = true;

        async function loadActiveLocality() {
            if (!mapState.locality) {
                setActiveLocalityInfo(null);
                return;
            }

            try {
                const data = await localitiesApi.getLocalities({
                    q: mapState.locality,
                    limit: 1,
                });

                if (!isMounted) {
                    return;
                }

                setActiveLocalityInfo(data.localities?.[0] ?? null);
            } catch (error) {
                console.error("Не удалось загрузить выбранный населённый пункт:", error);

                if (isMounted) {
                    setActiveLocalityInfo(null);
                }
            }
        }

        loadActiveLocality();

        return () => {
            isMounted = false;
        };
    }, [mapState.locality]);

    useEffect(() => {
        if (placesLoading || placesError) {
            return;
        }

        if (queryCategory && mapState.category !== queryCategory) {
            mapState.setCategory(queryCategory, {
                keepSelectedPlace: true,
            });
        }

        if (!queryPlaceId) {
            return;
        }

        const targetPlace = allPlaces.find((place) => {
            return String(place.id) === String(queryPlaceId);
        });

        if (!targetPlace) {
            return;
        }

        if (mapState.selectedPlaceId !== String(targetPlace.id)) {
            mapState.setSelectedPlaceId(String(targetPlace.id));
        }
    }, [
        allPlaces,
        placesLoading,
        placesError,
        queryCategory,
        queryPlaceId,
        mapState,
    ]);


    const activeLocalityLabel = useMemo(() => {
        if (!activeLocalityInfo) {
            return "";
        }

        return [
            activeLocalityInfo.title,
            activeLocalityInfo.districtTitle || activeLocalityInfo.district,
            activeLocalityInfo.regionTitle || activeLocalityInfo.region,
        ]
            .filter(Boolean)
            .join(", ");
    }, [activeLocalityInfo]);

    const filteredPlaces = useMemo(() => {
        return filterPlaces(allPlaces, {
            category: mapState.category,
            search: debouncedSearch,
            locality: activeLocalityInfo ? {
                ...activeLocalityInfo,
                value: mapState.locality,
            } : mapState.locality,
            type: mapState.type,
        });
    }, [
        activeLocalityInfo,
        allPlaces,
        mapState.category,
        mapState.locality,
        mapState.type,
        debouncedSearch,
    ]);

    const selectedPlace = useMemo(() => {
        return (
            allPlaces.find((place) => {
                return String(place.id) === mapState.selectedPlaceId;
            }) ?? null
        );
    }, [allPlaces, mapState.selectedPlaceId]);

    const hoveredPlace = useMemo(() => {
        return (
            allPlaces.find((place) => {
                return String(place.id) === mapState.hoveredPlaceId;
            }) ?? null
        );
    }, [allPlaces, mapState.hoveredPlaceId]);

    function handleSelectPlace(place) {
        mapState.setSelectedPlaceId(String(place.id));
    }

    function handleHoverPlace(place) {
        mapState.setHoveredPlaceId(place ? String(place.id) : null);
    }

    function handleSelectCategory(categoryId) {
        mapState.clearSelectedPlace();
        mapState.setCategory(categoryId);
    }

    function handleSearchChange(value) {
        mapState.clearSelectedPlace();
        mapState.setSearch(value);
    }

    function handleSelectLocality(locality) {
        mapState.setLocality(locality);
    }

    function handleSelectType(type) {
        mapState.setType(type);
    }

    function renderSidebar(isMobileSheet = false) {
        return (
            <MapSidebar
                places={filteredPlaces}
                filterOptionsPlaces={allPlaces}
                selectedPlace={selectedPlace}
                hoveredPlace={hoveredPlace}
                activeCategory={mapState.category}
                search={mapState.search}
                activeLocality={mapState.locality}
                activeLocalityLabel={activeLocalityLabel}
                activeType={mapState.type}
                isMobileSheet={isMobileSheet}
                onSelectCategory={handleSelectCategory}
                onSelectPlace={handleSelectPlace}
                onClearSelected={mapState.clearSelectedPlace}
                onSearchChange={handleSearchChange}
                onSelectLocality={handleSelectLocality}
                onSelectType={handleSelectType}
                onHoverPlace={handleHoverPlace}
            />
        );
    }

    return (
        <>
            <Seo
                title="Карта Native Places — недвижимость, аренда, отдых, рыбалка и охота"
                description="Интерактивная карта Native Places с объявлениями о недвижимости, аренде, базах отдыха, рыбалке, охоте и природных местах. Ищите объекты по категориям, типам и населённым пунктам."
                canonical="https://native-places.ru/map"
                image="https://native-places.ru/images/logo/logo.png"
            />

            <main className="map-page">
                <section className="map-shell">
                    <div className="map-area">
                        <MapView
                            places={filteredPlaces}
                            selectedPlace={selectedPlace}
                            hoveredPlace={hoveredPlace}
                            onSelectPlace={handleSelectPlace}
                            onHoverPlace={handleHoverPlace}
                        />
                    </div>

                    <div className="map-sidebar-desktop">
                        {placesLoading && <p>Загружаем объекты...</p>}
                        {placesError && <p>{placesError}</p>}
                        {!placesLoading && !placesError && renderSidebar()}
                    </div>

                    <MapBottomSheet
                        state={mapState.sheetState}
                        onStateChange={mapState.setSheetState}
                    >
                        {placesLoading && <p>Загружаем объекты...</p>}
                        {placesError && <p>{placesError}</p>}
                        {!placesLoading && !placesError && renderSidebar(true)}
                    </MapBottomSheet>
                </section>
            </main>
        </>
    );
}