import { MAP_CATEGORY_ALL } from "../../shared/config/categoryConfig.js";
import { buildPlaceSearchText } from "./buildPlaceSearchText.js";
import { normalizeSearchText } from "../search/normalizeSearchText.js";

function placeMatchesCategory(place, category) {
    return category === MAP_CATEGORY_ALL || place.categorySlug === category;
}

function getLocalityFilterParts(locality) {
    if (!locality) {
        return { value: "", keywords: [] };
    }

    if (typeof locality !== "object") {
        return {
            value: String(locality).toLowerCase(),
            keywords: [],
        };
    }

    const value = String(locality.value || locality.slug || locality.id || "").toLowerCase();
    const keywords = [
        locality.title,
        locality.districtTitle || locality.district,
        locality.regionTitle || locality.region,
    ]
        .map((item) => normalizeSearchText(item))
        .filter(Boolean);

    const titleKeyword = normalizeSearchText(locality.title);

    if (titleKeyword.length >= 4) {
        keywords.push(titleKeyword.slice(0, Math.min(6, titleKeyword.length)));
    }

    return {
        value,
        keywords: [...new Set(keywords)],
    };
}

function placeMatchesLocality(place, locality) {
    const { value, keywords } = getLocalityFilterParts(locality);

    if (!value && keywords.length === 0) {
        return true;
    }

    if (
        String(place.localityId || "") === value ||
        String(place.localitySlug || "").toLowerCase() === value
    ) {
        return true;
    }

    if (keywords.length === 0) {
        return false;
    }

    const searchableText = buildPlaceSearchText(place);

    return keywords.some((keyword) => searchableText.includes(keyword));
}

function placeMatchesType(place, type) {
    if (!type) {
        return true;
    }

    const value = String(type).toLowerCase();

    return String(place.typeSlug || "").toLowerCase() === value;
}

function placeMatchesSearch(place, search) {
    if (!search) {
        return true;
    }

    const searchableText = buildPlaceSearchText(place);

    return searchableText.includes(search);
}

export function filterPlaces(places, { category = MAP_CATEGORY_ALL, search = "", locality = "", type = "" } = {}) {
    const normalizedSearch = normalizeSearchText(search);

    return places.filter((place) => {
        return (
            placeMatchesCategory(place, category) &&
            placeMatchesLocality(place, locality) &&
            placeMatchesType(place, type) &&
            placeMatchesSearch(place, normalizedSearch)
        );
    });
}