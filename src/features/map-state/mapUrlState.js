import { MAP_CATEGORY_ALL, isKnownMapCategory } from "../../shared/config/categoryConfig";
import { MAP_URL_PARAMS } from "./mapStateConstants";

export function getValidCategoryFromParams(searchParams) {
    const category = searchParams.get(MAP_URL_PARAMS.CATEGORY);

    if (!category || !isKnownMapCategory(category)) {
        return MAP_CATEGORY_ALL;
    }

    return category;
}

export function getPlaceIdFromParams(searchParams) {
    return searchParams.get(MAP_URL_PARAMS.PLACE) ?? null;
}

export function getSearchFromParams(searchParams) {
    return searchParams.get(MAP_URL_PARAMS.SEARCH) ?? "";
}

export function getLocalityFromParams(searchParams) {
    return searchParams.get(MAP_URL_PARAMS.LOCALITY) ?? "";
}

export function getTypeFromParams(searchParams) {
    return searchParams.get(MAP_URL_PARAMS.TYPE) ?? "";
}

export function updateMapSearchParams(searchParams, changes) {
    const nextParams = new URLSearchParams(searchParams);

    Object.entries(changes).forEach(([key, value]) => {
        const normalizedValue = typeof value === "string" ? value.trim() : value;

        if (!normalizedValue || normalizedValue === MAP_CATEGORY_ALL) {
            nextParams.delete(key);
            return;
        }

        nextParams.set(key, normalizedValue);
    });

    return nextParams;
}
