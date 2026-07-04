import { MAP_CATEGORY_ALL, isKnownMapCategory } from "../../shared/config/categoryConfig";

export const MAP_CATEGORY_SEARCH_PARAM = "category";

export function getCategoryFromSearchParams(searchParams) {
    const categoryFromUrl = searchParams.get(MAP_CATEGORY_SEARCH_PARAM);

    if (!categoryFromUrl) return MAP_CATEGORY_ALL;

    return isKnownMapCategory(categoryFromUrl) ? categoryFromUrl : MAP_CATEGORY_ALL;
}

export function createMapCategorySearchParams(categorySlug) {
    const nextSearchParams = new URLSearchParams();

    if (categorySlug && categorySlug !== MAP_CATEGORY_ALL) {
        nextSearchParams.set(MAP_CATEGORY_SEARCH_PARAM, categorySlug);
    }

    return nextSearchParams;
}
