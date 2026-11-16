import { apiClient } from "./apiClient";

// Separate admin domain: never reuse paid places endpoints.
export const directoryApi = {
    list() {
        return apiClient.get("/admin/directory/index.php");
    },
    setPublication(id, action, csrfToken) {
        return apiClient.post("/admin/directory/publication.php", {
            id, action, csrf_token: csrfToken,
        });
    },
    save(entry, csrfToken) {
        return apiClient.post("/admin/directory/save.php", {
            ...entry,
            csrf_token: csrfToken,
        });
    },
};
