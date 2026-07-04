import { apiClient } from "./apiClient";

export const moderatorLogsApi = {
    getLogs() {
        return apiClient.get("/admin/moderator-logs/index.php");
    },
};