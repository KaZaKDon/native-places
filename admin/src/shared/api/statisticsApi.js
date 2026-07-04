import { apiClient } from "./apiClient";

export const statisticsApi = {
    getStatistics() {
        return apiClient.get("/admin/statistics/index.php");
    },
};