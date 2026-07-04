const MEDIA_BASE_URL =
    import.meta.env?.VITE_MEDIA_BASE_URL ?? "https://native-places.ru";

export function getMediaUrl(path) {
    if (!path) {
        return "";
    }

    if (path.startsWith("http://") || path.startsWith("https://")) {
        return path;
    }

    const normalizedPath = path.startsWith("/") ? path : `/${path}`;

    if (normalizedPath.startsWith("/images/")) {
        return normalizedPath;
    }

    return `${MEDIA_BASE_URL}${normalizedPath}`;
}