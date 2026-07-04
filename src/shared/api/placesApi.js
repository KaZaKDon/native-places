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

function normalizeCategoryParam(code) {
    if (code === "real-estate") {
        return "real_estate";
    }

    return code || "";
}

function mapAttributesFromApi(attributes = []) {
    if (!Array.isArray(attributes)) {
        return [];
    }

    return attributes
        .filter((attribute) => {
            return attribute && String(attribute.value ?? "").trim() !== "";
        })
        .map((attribute) => ({
            id: attribute.attribute_definition_id,
            code: attribute.code || "",
            title: attribute.title || "",
            fieldType: attribute.field_type || "text",
            sortOrder: Number(attribute.sort_order || 0),
            value: String(attribute.value ?? "").trim(),
        }));
}

function getAttributeValue(attributes, code) {
    const attribute = attributes.find((item) => item.code === code);

    return attribute?.value || "";
}

function mapPlaceFromApi(place, images = [], attributes = []) {
    const gallery =
        images.length > 0 ?
        images.map((image) => getMediaUrl(image.image_path)) :
        place.cover_image ?
        [getMediaUrl(place.cover_image)] :
        [];

    const mappedAttributes = mapAttributesFromApi(attributes);

    return {
        id: place.id,
        slug: place.slug,
        title: place.title,

        categorySlug: normalizeCategoryCode(place.category_code),
        categoryTitle: place.category_title || "Без категории",
        categoryIcon: place.category_icon || "",
        categoryColor: place.category_color || "",

        typeSlug: place.type_code || "",
        typeTitle: place.type_title || "",

        shortDescription: place.short_description || "",
        description: place.short_description || "",
        fullDescription: place.full_description || "",

        locality: place.locality_title || place.address || "",
        localityId: place.locality_id ? Number(place.locality_id) : null,
        localityTitle: place.locality_title || "",
        localitySlug: place.locality_slug || "",
        localityRegion: place.locality_region || "",
        localityDistrict: place.locality_district || "",
        address: place.address || "",

        price: getAttributeValue(mappedAttributes, "price") ||
            String(place.price ?? "").trim(),
        area: getAttributeValue(mappedAttributes, "area"),
        landArea: getAttributeValue(mappedAttributes, "land_area"),
        rooms: getAttributeValue(mappedAttributes, "rooms"),

        attributes: mappedAttributes,

        tags: [
            place.locality_title,
            place.locality_district,
            place.category_title,
            place.type_title,
            place.address,
        ].filter(Boolean),

        position: place.latitude && place.longitude ?
            [Number(place.latitude), Number(place.longitude)] :
            null,

        image: gallery[0] || "",
        gallery,

        contact: {
            name: place.contact_name || "",
            phone: place.phone || "",
            telegram: place.telegram || "",
            email: place.email || "",
            website: place.website || "",
        },

        status: place.status || "",
        publicationType: place.publication_type || "",
        isCommercial: Boolean(Number(place.is_commercial)),
        bookingType: place.booking_type || "",
        bookingUrl: place.booking_url || "",
        createdAt: place.created_at || "",
    };
}
export async function getPlaces(params = {}) {
    const apiParams = {
        ...params,
        category: normalizeCategoryParam(params.category),
    };

    const data = await apiClient.get("/places/index.php", apiParams);

    return {
        places: Array.isArray(data.places) ?
            data.places.map((place) => mapPlaceFromApi(place)) :
            [],
    };
}

export async function getMapPlaces(params = {}) {
    const apiParams = {
        ...params,
        category: normalizeCategoryParam(params.category),
    };

    const data = await apiClient.get("/places/map.php", apiParams);

    return {
        places: Array.isArray(data.places) ?
            data.places
            .map((place) => mapPlaceFromApi(place))
            .filter((place) => place.position) :
            [],
    };
}

export async function getPlaceBySlug(slug) {
    const data = await apiClient.get("/places/show.php", {
        slug,
    });

    return {
        place: data.place ?
            mapPlaceFromApi(
                data.place,
                data.images ?? [],
                data.attributes ?? []
            ) :
            null,
    };
}

export const placesApi = {
    getPlaces,
    getMapPlaces,
    getPlaceBySlug,
};
