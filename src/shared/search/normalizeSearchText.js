export function normalizeSearchText(value = "") {
    return String(value)
        .trim()
        .toLowerCase()
        .replaceAll("ё", "е")
        .replace(/\s+/g, " ");
}