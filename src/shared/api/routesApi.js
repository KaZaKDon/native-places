import {
    apiClient
} from "./apiClient.js";
import {
    getMediaUrl
} from "./mediaUrl.js";

function normalizeCategoryCode(code) {
    if (code === "real_estate") {
        return "real-estate";
    }

    return code || "";
}

function mapRoutePlaceFromApi(place) {
    return {
        routePlaceId: place.route_place_id,

        id: place.id,
        slug: place.slug,
        title: place.title,

        shortDescription: place.short_description || "",
        description: place.short_description || "",

        image: getMediaUrl(place.cover_image),

        address: place.address || "",
        locality: place.address || "",

        position: place.latitude && place.longitude ?
            [Number(place.latitude), Number(place.longitude)] :
            null,

        categorySlug: normalizeCategoryCode(place.category_code),
        categoryTitle: place.category_title || "",

        typeSlug: place.type_code || "",
        typeTitle: place.type_title || "",

        note: place.note || "",
        sortOrder: Number(place.sort_order ?? 0),
        status: place.status || "",
    };
}

function mapRouteFromApi(route, places = []) {
    return {
        id: route.id,
        title: route.title || "Без названия",
        description: route.description || "",
        isPublic: Boolean(Number(route.is_public)),
        shareToken: route.share_token || "",
        status: route.status || "active",
        completedAt: route.completed_at || "",
        archivedAt: route.archived_at || "",
        placesCount: Number(route.places_count ?? places.length ?? 0),
        places: places.map(mapRoutePlaceFromApi),
        createdAt: route.created_at || "",
        updatedAt: route.updated_at || "",
    };
}

export const routesApi = {
    async getRoutes() {
        const data = await apiClient.get("/routes/index.php");

        return {
            routes: Array.isArray(data.routes) ?
                data.routes.map((route) => mapRouteFromApi(route)) :
                [],
        };
    },

    async getArchivedRoutes() {
        const data = await apiClient.get("/routes/archive-index.php");

        return {
            routes: Array.isArray(data.routes) ?
                data.routes.map((route) => mapRouteFromApi(route)) :
                [],
        };
    },

    async createRoute({
        title,
        description,
        isPublic = false
    }) {
        const data = await apiClient.post("/routes/create.php", {
            title,
            description,
            is_public: isPublic,
        });

        return {
            route: mapRouteFromApi(data.route),
        };
    },

    async getRoute(routeId) {
        const data = await apiClient.get("/routes/show.php", {
            route_id: routeId,
        });

        return {
            route: data.route ?
                mapRouteFromApi(data.route, data.places ?? []) :
                null,
        };
    },

    async updateRoute({
        routeId,
        title,
        description,
        isPublic = false
    }) {
        return apiClient.post("/routes/update.php", {
            route_id: routeId,
            title,
            description,
            is_public: isPublic,
        });
    },

    async archiveRoute(routeId) {
        return apiClient.post("/routes/archive.php", {
            route_id: routeId,
        });
    },

    async restoreRoute(routeId) {
        return apiClient.post("/routes/restore.php", {
            route_id: routeId,
        });
    },

    async completeRoute(routeId) {
        return apiClient.post("/routes/complete.php", {
            route_id: routeId,
        });
    },

    async deleteRoute(routeId) {
        return apiClient.post("/routes/delete.php", {
            route_id: routeId,
        });
    },

    async addPlaceToRoute({
        routeId,
        placeId,
        note = ""
    }) {
        return apiClient.post("/routes/add-place.php", {
            route_id: routeId,
            place_id: placeId,
            note,
        });
    },

    async removePlaceFromRoute(routePlaceId) {
        return apiClient.post("/routes/remove-place.php", {
            route_place_id: routePlaceId,
        });
    },

    async reorderRoutePlaces({
        routeId,
        routePlaceIds
    }) {
        return apiClient.post("/routes/reorder.php", {
            route_id: routeId,
            items: routePlaceIds,
        });
    },

    async getSharedRoute(token) {
        const data = await apiClient.get("/routes/share.php", {
            token,
        });

        return {
            route: data.route ?
                mapRouteFromApi(data.route, data.places ?? []) :
                null,
        };
    },
};