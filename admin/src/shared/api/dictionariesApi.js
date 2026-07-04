import { apiClient } from "./apiClient";

export const dictionariesApi = {
    getData() {
        return apiClient.get("/admin/dictionaries/index.php");
    },

    createGroup(payload) {
        return apiClient.post(
            "/admin/dictionaries/create-group.php",
            payload
        );
    },

    updateGroup(payload) {
        return apiClient.post(
            "/admin/dictionaries/update-group.php",
            payload
        );
    },

    createValue(payload) {
        return apiClient.post(
            "/admin/dictionaries/create-value.php",
            payload
        );
    },

    updateValue(payload) {
        return apiClient.post(
            "/admin/dictionaries/update-value.php",
            payload
        );
    },

    deleteValue(id) {
        return apiClient.post(
            "/admin/dictionaries/delete-value.php",
            { id }
        );
    },
};