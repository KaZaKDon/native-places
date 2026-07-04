import { apiClient } from "./apiClient.js";

function mapLocalityFromApi(locality) {
    return {
        id: Number(locality.id),
        countryId: locality.country_id ? Number(locality.country_id) : null,
        regionId: locality.region_id ? Number(locality.region_id) : null,
        districtId: locality.district_id ? Number(locality.district_id) : null,
        type: locality.type || "",
        region: locality.region || locality.region_title || "",
        district: locality.district || locality.district_title || "",
        title: locality.title || "",
        slug: locality.slug || "",
        latitude: locality.latitude ? Number(locality.latitude) : null,
        longitude: locality.longitude ? Number(locality.longitude) : null,
        countryTitle: locality.country_title || "",
        countrySlug: locality.country_slug || "",
        countryCode: locality.country_code || "",
        regionTitle: locality.region_title || locality.region || "",
        regionSlug: locality.region_slug || "",
        regionType: locality.region_type || "",
        districtTitle: locality.district_title || locality.district || "",
        districtSlug: locality.district_slug || "",
        districtType: locality.district_type || "",
    };
}

export const localitiesApi = {
    async getLocalities(params = {}) {
        const data = await apiClient.get("/localities/index.php", params);

        return {
            localities: Array.isArray(data.localities)
                ? data.localities.map(mapLocalityFromApi)
                : [],
            filters: data.filters || {},
        };
    },
};
