import { apiClient } from "./apiClient";

function buildQuery(params = {}) {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value && value !== "all") {
            searchParams.set(key, value);
        }
    });

    const query = searchParams.toString();

    return query ? `?${query}` : "";
}

export const placesApi = {
    getPlaces(params) {
        return apiClient.get(`/admin/places/index.php${buildQuery(params)}`);
    },

    getPlace(placeId) {
        return apiClient.get(`/admin/places/show.php?id=${placeId}`);
    },

    publishPlace(placeId) {
        return apiClient.post("/admin/places/publish.php", {
            id: placeId,
        });
    },

    rejectPlace(placeId, comment = "") {
        return apiClient.post("/admin/places/reject.php", {
            id: placeId,
            comment,
        });
    },

    archivePlace(placeId) {
        return apiClient.post("/admin/places/archive.php", {
            id: placeId,
        });
    },
};