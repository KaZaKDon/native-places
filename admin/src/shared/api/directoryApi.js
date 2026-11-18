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

// v0.4a: isolated admin-only river segments and evidence sources.
export const directorySegmentsApi = {
    list(riverId) {
        // Listing all rivers' segments is admin-only, filtered locally by the selected river.
        return apiClient.get(`/admin/directory/segments/index.php${riverId ? `?river_entry_id=${encodeURIComponent(riverId)}` : ""}`);
    },
    save(segment, csrfToken) {
        return apiClient.post("/admin/directory/segments/save.php", { ...segment, csrf_token: csrfToken });
    },
    sources() {
        return apiClient.get("/admin/directory/sources/index.php");
    },
    addSource(source, csrfToken) {
        return apiClient.post("/admin/directory/sources/save.php", { ...source, csrf_token: csrfToken });
    },
};

// v0.4b: admin-only drafts. No public API/SEO routes in this patch.
export const directorySpeciesApi = {
    list() { return apiClient.get('/admin/directory/species/index.php'); },
    setPublication(id, action, token) { return apiClient.post('/admin/directory/species/publication.php', { id, action, csrf_token:token }); },
    save(species, token) { return apiClient.post('/admin/directory/species/save.php', { ...species, csrf_token: token }); },
    occurrences(speciesId) { return apiClient.get(`/admin/directory/occurrences/index.php?species_id=${encodeURIComponent(speciesId)}`); },
    saveOccurrence(data, token) { return apiClient.post('/admin/directory/occurrences/save.php', { ...data, csrf_token: token }); },
    media(speciesId) { return apiClient.get(`/admin/directory/media/index.php?species_id=${encodeURIComponent(speciesId)}`); },
    uploadPhoto(speciesId, photo, token) {
        const body = new FormData();
        for (const [name, value] of Object.entries(photo)) {
            if (name !== 'image' && name !== 'rights_confirmed') body.append(name, value ?? '');
        }
        body.append('species_id', String(speciesId));
        body.append('csrf_token', token);
        body.append('rights_confirmed', photo.rights_confirmed ? '1' : '0');
        body.append('image', photo.image);
        return apiClient.post('/admin/directory/media/upload.php', body);
    },
    imageUrl(id) { return `/api/admin/directory/media/image.php?id=${encodeURIComponent(id)}`; },
    deletePhoto(id, speciesId, token) { return apiClient.post('/admin/directory/media/delete.php', { id, species_id:speciesId, csrf_token:token }); },
    deleteOccurrence(id, speciesId, token) { return apiClient.post('/admin/directory/occurrences/delete.php', { id, species_id:speciesId, csrf_token:token }); },
};
