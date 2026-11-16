// Independent information taxonomy; not part of paid advertising categories.
export const DIRECTORY_TYPES = Object.freeze({
    river: { label: "Река", group: "Реки и водоёмы" },
    lake: { label: "Озеро или водоём", group: "Реки и водоёмы" },
    forest: { label: "Лес", group: "Природные территории" },
    natural_area: { label: "Природная территория", group: "Природные территории" },
    hunting_ground: { label: "Охотничье угодье", group: "Охотничьи угодья" },
    landmark: { label: "Достопримечательность", group: "Интересные места" },
    spring: { label: "Родник", group: "Интересные места" },
});
export function directoryEntryPath(entry) {
    if (!entry || !Object.hasOwn(DIRECTORY_TYPES, entry.type) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.slug || "")) {
        return "/directory";
    }
    return `/directory/${entry.type}/${entry.slug}`;
}
export function directoryEntryTitle(entry) {
    return `${entry.title} — ${DIRECTORY_TYPES[entry.type]?.label || "Справочник"} | Native Places`;
}
export function directoryEntryDescription(entry) {
    return [entry.summary, entry.region].filter(Boolean).join(" ").trim().slice(0, 170);
}
