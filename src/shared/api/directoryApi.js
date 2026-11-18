import { apiClient } from "./apiClient";

// Public endpoints never return drafts; editor APIs live under /api/admin/directory.
export const directoryApi = {
    list({ type, page = 1 } = {}) {
        return apiClient.get("/directory/index.php", { type, page });
    },
    show(type, slug) {
        return apiClient.get("/directory/show.php", { type, slug });
    },
    speciesShow(slug) {
        return apiClient.get("/directory/species/show.php", { slug });
    },
    map() {
        return apiClient.get("/directory/map.php");
    },
};
