export function mapPlaceFromApi(place) {
    const ownerName = [place.owner_first_name, place.owner_last_name]
        .filter(Boolean)
        .join(" ");

    return {
        ...place,
        category: place.category_title || "—",
        type: place.type_title || "—",
        owner: ownerName || place.owner_email || "—",
        createdAt: place.created_at || "—",
    };
}

export function getPlaceCategories(places) {
    const categories = places.reduce((items, place) => {
        if (!place.category_title || items.includes(place.category_title)) {
            return items;
        }

        return [...items, place.category_title];
    }, []);

    return ["all", ...categories];
}