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

export const appealsApi = {
    getAppeals(params) {
        return apiClient.get(`/admin/appeals/index.php${buildQuery(params)}`);
    },

    getAppeal(appealId) {
        return apiClient.get(`/admin/appeals/show.php?id=${appealId}`);
    },

    updateAppeal({ id, status, adminResponse }) {
        return apiClient.post("/admin/appeals/update.php", {
            id,
            status,
            admin_response: adminResponse,
        });
    },
};