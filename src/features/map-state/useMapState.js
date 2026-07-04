import { useState } from "react";
import { useSearchParams } from "react-router-dom";

import { MAP_CATEGORY_ALL } from "../../shared/config/categoryConfig";
import { MAP_SHEET_STATES, MAP_URL_PARAMS } from "./mapStateConstants";
import {
    getLocalityFromParams,
    getPlaceIdFromParams,
    getSearchFromParams,
    getTypeFromParams,
    getValidCategoryFromParams,
    updateMapSearchParams,
} from "./mapUrlState";

export function useMapState() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [hoveredPlaceId, setHoveredPlaceId] = useState(null);
    const [sheetState, setSheetState] = useState(MAP_SHEET_STATES.COLLAPSED);

    const category = getValidCategoryFromParams(searchParams);
    const selectedPlaceId = getPlaceIdFromParams(searchParams);
    const search = getSearchFromParams(searchParams);
    const locality = getLocalityFromParams(searchParams);
    const type = getTypeFromParams(searchParams);

    function patchUrlParams(changes) {
        const nextParams = updateMapSearchParams(searchParams, changes);

        if (nextParams.toString() === searchParams.toString()) {
            return;
        }

        setSearchParams(nextParams, {
            replace: true,
        });
    }

    function setCategory(categorySlug, options = {}) {
        const { keepSelectedPlace = false } = options;

        patchUrlParams({
            [MAP_URL_PARAMS.CATEGORY]:
                categorySlug === MAP_CATEGORY_ALL ? null : categorySlug,
            [MAP_URL_PARAMS.PLACE]: keepSelectedPlace ? selectedPlaceId : null,
            [MAP_URL_PARAMS.TYPE]: null,
        });

        setSheetState(MAP_SHEET_STATES.HALF);
    }

    function setSelectedPlaceId(placeId) {
        patchUrlParams({
            [MAP_URL_PARAMS.PLACE]: placeId,
        });

        setSheetState(MAP_SHEET_STATES.HALF);
    }

    function clearSelectedPlace() {
        patchUrlParams({
            [MAP_URL_PARAMS.PLACE]: null,
        });

        setSheetState(MAP_SHEET_STATES.HALF);
    }

    function setSearch(searchValue) {
        patchUrlParams({
            [MAP_URL_PARAMS.SEARCH]: searchValue,
            [MAP_URL_PARAMS.PLACE]: null,
        });

        setSheetState(MAP_SHEET_STATES.HALF);
    }

    function setLocality(localityValue) {
        patchUrlParams({
            [MAP_URL_PARAMS.LOCALITY]: localityValue,
            [MAP_URL_PARAMS.SEARCH]: null,
            [MAP_URL_PARAMS.PLACE]: null,
        });

        setSheetState(MAP_SHEET_STATES.HALF);
    }

    function setType(typeValue) {
        patchUrlParams({
            [MAP_URL_PARAMS.TYPE]: typeValue,
            [MAP_URL_PARAMS.SEARCH]: null,
            [MAP_URL_PARAMS.PLACE]: null,
        });

        setSheetState(MAP_SHEET_STATES.HALF);
    }

    return {
        category,
        selectedPlaceId,
        search,
        locality,
        type,
        hoveredPlaceId,
        sheetState,
        setCategory,
        setSelectedPlaceId,
        clearSelectedPlace,
        setSearch,
        setLocality,
        setType,
        setHoveredPlaceId,
        setSheetState,
    };
}