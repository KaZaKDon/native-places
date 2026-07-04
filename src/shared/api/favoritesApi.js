import { apiClient } from "./apiClient.js";
import { getMediaUrl } from "./mediaUrl.js";

function normalizeCategoryCode(code) {
    if (code === "real_estate") {
        return "real-estate";
    }

    return code || "";
}

function mapFavoriteFromApi(item) {
    return {
        favoriteId: item.favorite_id,

        id: item.id,
        slug: item.slug,
        title: item.title,

        shortDescription: item.short_description || "",
        description: item.short_description || "",

        image: item.cover_image
            ? getMediaUrl(item.cover_image)
            : "",

        locality: item.address || "",
        address: item.address || "",

        categorySlug: normalizeCategoryCode(item.category_code),
        categoryTitle: item.category_title || "",

        typeSlug: item.type_code || "",
        typeTitle: item.type_title || "",
    };
}

export const favoritesApi = {
    async getFavorites() {
        const data = await apiClient.get("/favorites/index.php");

        return {
            favorites: Array.isArray(data.favorites)
                ? data.favorites.map(mapFavoriteFromApi)
                : [],
        };
    },

    async toggleFavorite(placeId) {
        return apiClient.post("/favorites/toggle.php", {
            place_id: placeId,
        });
    },

    async checkFavorite(placeId) {
        return apiClient.get("/favorites/check.php", {
            place_id: placeId,
        });
    },
};