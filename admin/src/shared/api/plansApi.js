import { apiClient } from "./apiClient";

export const plansApi = {
    getPlans() {
        return apiClient.get("/admin/plans/index.php");
    },

    createPlan(payload) {
        return apiClient.post("/admin/plans/create.php", payload);
    },

    updatePlan(payload) {
        return apiClient.post("/admin/plans/update.php", payload);
    },
};