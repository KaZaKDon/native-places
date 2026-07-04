import { apiClient } from "./apiClient";

export const placeTypesApi = {
    getPlaceTypes() {
        return apiClient.get("/admin/place-types/index.php");
    },

    createPlaceType(payload) {
        return apiClient.post("/admin/place-types/create.php", payload);
    },

    updatePlaceType(payload) {
        return apiClient.post("/admin/place-types/update.php", payload);
    },

    togglePlaceTypeActive(id, isActive) {
        return apiClient.post("/admin/place-types/toggle-active.php", {
            id,
            is_active: isActive ? 1 : 0,
        });
    },
};