export function getPlaceImages(place) {
    if (!place) {
        return [];
    }

    const gallery = Array.isArray(place.gallery)
        ? place.gallery.filter((image) => image !== place.image)
        : [];

    return [place.image, ...gallery].filter(Boolean);
}