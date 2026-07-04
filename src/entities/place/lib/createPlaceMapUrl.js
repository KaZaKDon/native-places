export function createPlaceMapUrl(place) {
    if (!place) {
        return "/map";
    }

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