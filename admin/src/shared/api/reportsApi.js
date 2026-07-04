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

export const reportsApi = {
    getReports(params) {
        return apiClient.get(`/admin/reports/index.php${buildQuery(params)}`);
    },

    getReport(reportId) {
        return apiClient.get(`/admin/reports/show.php?id=${reportId}`);
    },

    closeReport(reportId) {
        return apiClient.post("/admin/reports/close.php", {
            id: reportId,
        });
    },
};