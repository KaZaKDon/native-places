import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { localitiesApi } from "../../shared/api/localitiesApi";

import { mapCategories } from "../../shared/config/categoryConfig";
import { useDebouncedValue } from "../../shared/search/useDebouncedValue";

import "./MapSidebar.css";

const INITIAL_VISIBLE_COUNT = 15;
const LOAD_MORE_STEP = 15;

function formatLocalityOption(locality) {
    if (!locality) {
        return "";
    }

    return [
        locality.title,
        locality.districtTitle || locality.district,
        locality.regionTitle || locality.region,
    ]
        .filter(Boolean)
        .join(", ");
}

function getUniqueTagItems(items) {
    const seen = new Set();

    return items
        .map((item) => ({
            ...item,
            label: String(item.label ?? "").trim(),
        }))
        .filter((item) => {
            if (!item.label) {
                return false;
            }

            const key = item.label.toLowerCase();

            if (seen.has(key)) {
                return false;
            }

            seen.add(key);
            return true;
        });
}


function formatPlacePrice(price) {
    const value = String(price ?? "").trim();

    if (!value) {
        return "";
    }

    const normalizedNumber = Number(value.replace(/\s/g, ""));

    if (Number.isFinite(normalizedNumber) && normalizedNumber > 0) {
        return `${normalizedNumber.toLocaleString("ru-RU")} ₽`;
    }

    return value;
}

export function MapSidebar({
    places = [],
    filterOptionsPlaces = places,
    selectedPlace,
    hoveredPlace,
    activeCategory = "all",
    search = "",
    activeLocality = "",
    activeLocalityLabel: activeLocalityLabelProp = "",
    activeType = "",
    isMobileSheet = false,
    onSelectCategory,
    onSelectPlace,
    onClearSelected,
    onSearchChange,
    onSelectLocality,
    onSelectType,
    onHoverPlace,
}) {
    const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [localitySearch, setLocalitySearch] = useState("");
    const [localities, setLocalities] = useState([]);
    const [localitiesLoading, setLocalitiesLoading] = useState(false);
    const [localitiesError, setLocalitiesError] = useState("");
    const [localityMenuOpen, setLocalityMenuOpen] = useState(false);
    const debouncedLocalitySearch = useDebouncedValue(localitySearch, 300);

    const visiblePlaces = useMemo(() => {
        return places.slice(0, visibleCount);
    }, [places, visibleCount]);

    const hasMorePlaces = visibleCount < places.length;

    const typeOptions = useMemo(() => {
        const seen = new Set();

        return filterOptionsPlaces
            .map((place) => ({
                id: place.typeSlug,
                title: place.typeTitle,
            }))
            .filter((type) => {
                if (!type.id || !type.title) {
                    return false;
                }

                if (seen.has(type.id)) {
                    return false;
                }

                seen.add(type.id);
                return true;
            })
            .sort((first, second) => first.title.localeCompare(second.title));
    }, [filterOptionsPlaces]);

    const activeTypeLabel = useMemo(() => {
        if (!activeType) {
            return "";
        }

        const matchedType = typeOptions.find((type) => type.id === activeType);

        return matchedType?.title || activeType;
    }, [activeType, typeOptions]);

    const activeLocalityLabel = useMemo(() => {
        if (!activeLocality) {
            return "";
        }

        const matchedPlace = places.find((place) => {
            return (
                String(place.localityId || "") === String(activeLocality) ||
                String(place.localitySlug || "") === String(activeLocality)
            );
        });

        return activeLocalityLabelProp ||
            matchedPlace?.localityTitle ||
            matchedPlace?.locality ||
            String(activeLocality);
    }, [activeLocality, activeLocalityLabelProp, places]);

    const localityQuery = debouncedLocalitySearch.trim();
    const isLocalityQueryTooShort =
        localitySearch.trim().length > 0 && localityQuery.length < 2;
    const shouldShowLocalityEmptyState =
        !localitiesLoading &&
        localityQuery.length >= 2 &&
        localities.length === 0;

    useEffect(() => {
        let isMounted = true;

        if (!localityMenuOpen && localityQuery === "") {
            return () => {
                isMounted = false;
            };
        }

        if (localityQuery.length === 1) {
            return () => {
                isMounted = false;
            };
        }

        async function loadLocalities() {
            setLocalitiesLoading(true);

            try {
                const data = await localitiesApi.getLocalities({
                    q: localityQuery,
                    limit: localityQuery ? 10 : 20,
                });

                if (!isMounted) {
                    return;
                }

                setLocalities(
                    Array.isArray(data.localities) ? data.localities : []
                );
                setLocalitiesError("");
            } catch (error) {
                console.error("Не удалось загрузить населённые пункты:", error);

                if (isMounted) {
                    setLocalities([]);
                    setLocalitiesError(
                        error.message || "Не удалось загрузить населённые пункты."
                    );
                }
            } finally {
                if (isMounted) {
                    setLocalitiesLoading(false);
                }
            }
        }

        loadLocalities();

        return () => {
            isMounted = false;
        };
    }, [localityMenuOpen, localityQuery]);

    function handleSearchChange(event) {
        setVisibleCount(INITIAL_VISIBLE_COUNT);
        onSearchChange(event.target.value);
    }

    function handleCategorySelect(categoryId) {
        setVisibleCount(INITIAL_VISIBLE_COUNT);
        setFiltersOpen(false);
        onSelectCategory(categoryId);
    }

    function handleClearLocality() {
        setVisibleCount(INITIAL_VISIBLE_COUNT);
        setLocalitySearch("");
        setLocalityMenuOpen(false);
        onSelectLocality("");
    }

    function handleLocalitySearchChange(event) {
        setLocalitySearch(event.target.value);
        setLocalityMenuOpen(true);

        if (activeLocality) {
            onSelectLocality("");
        }
    }

    function handleSelectLocality(locality) {
        const value = locality.slug || locality.id;

        setVisibleCount(INITIAL_VISIBLE_COUNT);
        setLocalitySearch(formatLocalityOption(locality));
        setLocalityMenuOpen(false);
        onSelectLocality(value);
    }

    function handleTypeSelect(typeId) {
        setVisibleCount(INITIAL_VISIBLE_COUNT);
        onSelectType(typeId === activeType ? "" : typeId);
    }

    function handleClearType() {
        setVisibleCount(INITIAL_VISIBLE_COUNT);
        onSelectType("");
    }

    function handleTagSelect(tag) {
        setVisibleCount(INITIAL_VISIBLE_COUNT);

        if (tag.kind === "locality" && tag.value) {
            setLocalitySearch(tag.label);
            onSelectLocality(tag.value);
            return;
        }

        onSearchChange(tag.label);
    }

    if (selectedPlace) {
        const localityValue = selectedPlace.localitySlug || selectedPlace.localityId;
        const tags = getUniqueTagItems([
            {
                label: selectedPlace.localityTitle || selectedPlace.locality,
                kind: "locality",
                value: localityValue,
            },
            { label: selectedPlace.localityDistrict, kind: "search" },
            { label: selectedPlace.address, kind: "search" },
            { label: selectedPlace.typeTitle, kind: "search" },
            { label: selectedPlace.area, kind: "search" },
            { label: selectedPlace.landArea, kind: "search" },
        ]);

        return (
            <aside className={isMobileSheet ? "map-sidebar map-sidebar--sheet" : "map-sidebar"}>
                <button className="map-sidebar__back" type="button" onClick={onClearSelected}>
                    ← Назад к списку
                </button>

                <article className="place-panel">
                    <div className="place-panel__image">
                        {selectedPlace.image ? (
                            <img src={selectedPlace.image} alt={selectedPlace.title} />
                        ) : (
                            <span>Фото места</span>
                        )}
                    </div>

                    <p className="place-panel__category">{selectedPlace.categoryTitle}</p>

                    <h1>{selectedPlace.title}</h1>

                    {selectedPlace.price && (
                        <div className="place-panel__price">{selectedPlace.price}</div>
                    )}

                    <p className="place-panel__description">{selectedPlace.description}</p>

                    {tags.length > 0 && (
                        <div className="place-panel__tags">
                            {tags.map((tag) => (
                                <button
                                    key={`${tag.kind}-${tag.label}`}
                                    type="button"
                                    className={
                                        tag.kind === "locality" &&
                                            String(activeLocality) === String(tag.value)
                                            ? "place-panel__tag is-active"
                                            : "place-panel__tag"
                                    }
                                    onClick={() => handleTagSelect(tag)}
                                >
                                    {tag.label}
                                </button>
                            ))}
                        </div>
                    )}

                    <Link
                        className="place-panel__button"
                        to={`/place/${selectedPlace.slug}`}
                    >
                        Подробнее
                    </Link>
                </article>
            </aside>
        );
    }

    return (
        <aside className={isMobileSheet ? "map-sidebar map-sidebar--sheet" : "map-sidebar"}>
            <div className="map-sidebar__top">
                <Link className="map-sidebar__home" to="/">
                    ← На главную
                </Link>

                <Link className="map-sidebar__add-place" to="/submit">
                    + Добавить место
                </Link>

                <button
                    className="map-sidebar__filter-toggle"
                    type="button"
                    onClick={() => setFiltersOpen((value) => !value)}
                    aria-label="Открыть категории"
                    aria-expanded={filtersOpen}
                >
                    ☰
                </button>
            </div>

            <div className="map-sidebar__head">
                <h1>Исследуйте территорию</h1>
            </div>

            <div className="map-sidebar__locality-search">
                <span>Где искать?</span>

                <div className="map-sidebar__locality-combobox">
                    <input
                        type="text"
                        value={localitySearch}
                        placeholder="Начните вводить: Шахты, Ростов..."
                        autoComplete="off"
                        onChange={handleLocalitySearchChange}
                        onFocus={() => setLocalityMenuOpen(true)}
                    />

                    {activeLocality && (
                        <button
                            className="map-sidebar__locality-clear"
                            type="button"
                            onClick={handleClearLocality}
                            aria-label="Сбросить населённый пункт"
                        >
                            ×
                        </button>
                    )}

                    {localityMenuOpen && (
                        <div className="map-sidebar__locality-menu">
                            {localitiesLoading && (
                                <p className="map-sidebar__locality-message">
                                    Ищем населённые пункты...
                                </p>
                            )}

                            {isLocalityQueryTooShort && (
                                <p className="map-sidebar__locality-message">
                                    Введите минимум 2 символа для поиска.
                                </p>
                            )}

                            {!localitiesLoading &&
                                !isLocalityQueryTooShort &&
                                localities.map((locality) => (
                                    <button
                                        key={locality.id}
                                        className="map-sidebar__locality-option"
                                        type="button"
                                        onClick={() => handleSelectLocality(locality)}
                                    >
                                        <strong>{locality.title}</strong>
                                        <span>
                                            {[
                                                locality.districtTitle || locality.district,
                                                locality.regionTitle || locality.region,
                                                locality.countryTitle,
                                            ]
                                                .filter(Boolean)
                                                .join(", ")}
                                        </span>
                                    </button>
                                ))}

                            {shouldShowLocalityEmptyState && (
                                <p className="map-sidebar__locality-message">
                                    Не нашли населённый пункт? Напишите
                                    администратору — добавим.
                                </p>
                            )}

                            {localitiesError && (
                                <p className="map-sidebar__locality-message is-error">
                                    {localitiesError}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <label className="map-sidebar__search">
                <span>Поиск по карте</span>
                <input
                    type="search"
                    value={search}
                    placeholder="Название, район, описание..."
                    onChange={handleSearchChange}
                />
            </label>

            {filtersOpen && (
                <div className="map-sidebar__filters">
                    <span className="map-sidebar__filter-title">Категории</span>

                    {mapCategories.map((category) => (
                        <button
                            key={category.id}
                            className={
                                activeCategory === category.id
                                    ? "map-sidebar__filter is-active"
                                    : "map-sidebar__filter"
                            }
                            type="button"
                            onClick={() => handleCategorySelect(category.id)}
                        >
                            {category.title}
                        </button>
                    ))}

                    {typeOptions.length > 0 && (
                        <>
                            <span className="map-sidebar__filter-title">Тип объекта</span>

                            {typeOptions.map((type) => (
                                <button
                                    key={type.id}
                                    className={
                                        activeType === type.id
                                            ? "map-sidebar__filter is-active"
                                            : "map-sidebar__filter"
                                    }
                                    type="button"
                                    onClick={() => handleTypeSelect(type.id)}
                                >
                                    {type.title}
                                </button>
                            ))}
                        </>
                    )}
                </div>
            )}

            <div className="map-sidebar__count">
                Найдено объектов: <strong>{places.length}</strong>
            </div>

            {(activeLocality || activeType) && (
                <div className="map-sidebar__active-filters">
                    {activeLocality && (
                        <div className="map-sidebar__active-locality">
                            <span>Населённый пункт</span>
                            <strong>{activeLocalityLabel}</strong>
                            <button type="button" onClick={handleClearLocality}>
                                Сбросить
                            </button>
                        </div>
                    )}

                    {activeType && (
                        <div className="map-sidebar__active-locality">
                            <span>Тип объекта</span>
                            <strong>{activeTypeLabel}</strong>
                            <button type="button" onClick={handleClearType}>
                                Сбросить
                            </button>
                        </div>
                    )}
                </div>
            )}

            <div className="map-sidebar__list">
                {visiblePlaces.map((place) => {
                    const isHovered = hoveredPlace?.id === place.id;
                    const priceLabel = formatPlacePrice(place.price);

                    return (
                        <button
                            key={place.id}
                            className={isHovered ? "map-place-card is-hovered" : "map-place-card"}
                            type="button"
                            onClick={() => onSelectPlace(place)}
                            onMouseEnter={() => onHoverPlace?.(place)}
                            onMouseLeave={() => onHoverPlace?.(null)}
                        >
                            <span className="map-place-card__content">
                                <span className="map-place-card__category">{place.categoryTitle}</span>
                                <strong>{place.title}</strong>
                                <small>{place.shortDescription || place.description}</small>
                                {priceLabel && (
                                    <span className="map-place-card__price">
                                        {priceLabel}
                                    </span>
                                )}
                            </span>

                            {place.image && (
                                <span className="map-place-card__image">
                                    <img src={place.image} alt="" loading="lazy" />
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {hasMorePlaces && (
                <button
                    className="map-sidebar__load-more"
                    type="button"
                    onClick={() => setVisibleCount((count) => count + LOAD_MORE_STEP)}
                >
                    Показать еще
                </button>
            )}
        </aside>
    );
}