import {
    apiClient
} from "./apiClient.js";
import {
    getMediaUrl
} from "./mediaUrl.js";

function mapMyPlaceFromApi(place) {
    return {
        id: place.id,
        title: place.title,
        slug: place.slug,
        description: place.short_description || "",
        shortDescription: place.short_description || "",
        fullDescription: place.full_description || "",
        image: getMediaUrl(place.cover_image),
        categoryId: place.category_id || null,
        categoryTitle: place.category_title || "Без категории",
        categorySlug: place.category_code || "",
        placeTypeId: place.place_type_id || null,
        typeTitle: place.type_title || "",
        typeSlug: place.type_code || "",
        address: place.address || "",
        localityId: place.locality_id ? Number(place.locality_id) : null,
        localityTitle: place.locality_title || "",
        localitySlug: place.locality_slug || "",
        localityRegion: place.locality_region || "",
        localityDistrict: place.locality_district || "",
        status: place.status || "",
        publicationType: place.publication_type || "",
        isCommercial: Boolean(Number(place.is_commercial)),
        bookingType: place.booking_type || "",
        bookingUrl: place.booking_url || "",
        position: place.latitude && place.longitude ?
            [Number(place.latitude), Number(place.longitude)] :
            null,
        contact: {
            name: place.contact_name || "",
            phone: place.phone || "",
            telegram: place.telegram || "",
            email: place.email || "",
            website: place.website || "",
        },
        createdAt: place.created_at || "",
        updatedAt: place.updated_at || "",
    };
}

function mapAttributesToExtraFields(attributes = []) {
    const result = {};

    if (!Array.isArray(attributes)) {
        return result;
    }

    attributes.forEach((attribute) => {
        const definitionId = attribute.attribute_definition_id;

        if (!definitionId) {
            return;
        }

        result[String(definitionId)] = attribute.value ?? "";
    });

    return result;
}

function mapGalleryFromApi(images = [], coverImage = "") {
    if (Array.isArray(images) && images.length > 0) {
        return images
            .map((image) => ({
                id: image.id,
                url: getMediaUrl(image.image_path),
                path: image.image_path || "",
                sortOrder: Number(image.sort_order || 0),
                isCover: Boolean(Number(image.is_cover)),
                isUploaded: true,
            }))
            .filter((image) => image.url);
    }

    const coverUrl = getMediaUrl(coverImage);

    return coverUrl ?
        [{
            id: null,
            url: coverUrl,
            path: coverImage,
            sortOrder: 0,
            isCover: true,
            isUploaded: true,
        }, ] :
        [];
}

function mapEditablePlaceFromApi(place, images = [], attributes = []) {
    const mappedPlace = mapMyPlaceFromApi(place);

    return {
        ...mappedPlace,
        gallery: mapGalleryFromApi(images, place.cover_image),
        extraFields: mapAttributesToExtraFields(attributes),
    };
}

export const myPlacesApi = {
    async getMyPlaces() {
        const data = await apiClient.get("/my-places/index.php");

        return {
            places: Array.isArray(data.places) ?
                data.places.map(mapMyPlaceFromApi) :
                [],
        };
    },

    async getMyPlace(placeId) {
        const data = await apiClient.get("/my-places/show.php", {
            place_id: placeId,
        });

        return {
            place: data.place ?
                mapEditablePlaceFromApi(
                    data.place,
                    data.images ?? [],
                    data.attributes ?? []
                ) :
                null,
        };
    },

    async createMyPlace({
        title,
        categoryId,
        placeTypeId,
        localityId,
        planId,
    }) {
        return apiClient.post("/my-places/create.php", {
            title,
            category_id: categoryId,
            place_type_id: placeTypeId,
            locality_id: localityId,
            plan_id: planId,
        });
    },

    async updateMyPlace({
        id,
        title,
        shortDescription,
        fullDescription,
        address,
        localityId,
        latitude,
        longitude,
        contactName,
        phone,
        telegram,
        email,
        website,
        bookingType,
        bookingUrl,
    }) {
        return apiClient.post("/my-places/update.php", {
            id,
            title,
            short_description: shortDescription,
            full_description: fullDescription,
            address,
            locality_id: localityId,
            latitude,
            longitude,
            contact_name: contactName,
            phone,
            telegram,
            email,
            website,
            booking_type: bookingType,
            booking_url: bookingUrl,
        });
    },

    async saveMyPlaceAttributes(placeId, attributes) {
        return apiClient.post("/place-attributes/save.php", {
            place_id: placeId,
            attributes,
        });
    },

    async getAttributeDefinitions(categoryId) {
        return apiClient.get(
            `/place-attributes/definitions.php?category_id=${categoryId}`
        );
    },

    async deleteMyPlace(placeId) {
        return apiClient.post("/my-places/delete.php", {
            place_id: placeId,
        });
    },

    async restoreMyPlace(placeId) {
        return apiClient.post("/my-places/restore.php", {
            place_id: placeId,
        });
    },

    async removeMyPlace(placeId) {
        return apiClient.post("/my-places/remove.php", {
            place_id: placeId,
        });
    },

    async uploadMyPlaceImage(placeId, file) {
        const formData = new FormData();

        formData.append("place_id", String(placeId));
        formData.append("image", file);

        return apiClient.postForm("/place-images/upload.php", formData);
    },

    async deleteMyPlaceImage(imageId) {
        return apiClient.post("/place-images/delete.php", {
            image_id: imageId,
        });
    },

    async setMyPlaceCoverImage(imageId) {
        return apiClient.post("/place-images/set-cover.php", {
            image_id: imageId,
        });
    },

    async reorderMyPlaceImages(placeId, imageIds) {
        return apiClient.post("/place-images/reorder.php", {
            place_id: placeId,
            image_ids: imageIds,
        });
    },
};