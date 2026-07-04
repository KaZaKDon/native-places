import { normalizeSearchText } from "../search/normalizeSearchText.js";

export function buildPlaceSearchText(place) {
    return normalizeSearchText(
        [
            place.title,
            place.categoryTitle,
            place.categorySlug,
            place.locality,
            place.shortDescription,
            place.description,
            place.price,
            place.area,
            place.landArea,
            ...(place.tags ?? []),
        ]
            .filter(Boolean)
            .join(" ")
    );
}