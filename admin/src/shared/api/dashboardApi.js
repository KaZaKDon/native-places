import { apiClient } from "./apiClient";

export const dashboardApi = {
    getDashboard() {
        return apiClient.get("/admin/dashboard/index.php");
    },
};