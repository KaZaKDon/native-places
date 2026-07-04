import { apiClient } from "./apiClient";

export const attributesApi = {
    getAttributes() {
        return apiClient.get("/admin/attributes/index.php");
    },

    createAttribute(payload) {
        return apiClient.post("/admin/attributes/create.php", payload);
    },

    updateAttribute(payload) {
        return apiClient.post("/admin/attributes/update.php", payload);
    },

    deleteAttribute(id) {
        return apiClient.post("/admin/attributes/delete.php", {
            id,
        });
    },
};