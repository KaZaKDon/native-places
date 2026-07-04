import { apiClient } from "./apiClient";

export const categoriesApi = {
    getCategories() {
        return apiClient.get("/admin/categories/index.php");
    },

    createCategory(payload) {
        return apiClient.post("/admin/categories/create.php", payload);
    },

    updateCategory(payload) {
        return apiClient.post("/admin/categories/update.php", payload);
    },

    toggleCategoryActive(id, isActive) {
        return apiClient.post("/admin/categories/toggle-active.php", {
            id,
            is_active: isActive ? 1 : 0,
        });
    },
};