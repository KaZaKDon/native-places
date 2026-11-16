import { parseDirectoryGeoJSON } from "./geojson.js";
// Do not merge this taxonomy into the six paid advertising categories.
export const DIRECTORY_GROUPS = [
    {
        id: "waters",
        label: "Реки и водоёмы",
        types: [
            { value: "river", label: "Река" },
            { value: "lake", label: "Озеро или водоём" },
        ],
    },
    {
        id: "nature",
        label: "Природные территории",
        types: [
            { value: "forest", label: "Лес" },
            { value: "natural_area", label: "Природная территория" },
        ],
    },
    {
        id: "hunting",
        label: "Охотничьи угодья",
        types: [{ value: "hunting_ground", label: "Охотничье угодье" }],
    },
    {
        id: "landmarks",
        label: "Интересные места",
        types: [
            { value: "landmark", label: "Достопримечательность" },
            { value: "spring", label: "Родник" },
        ],
    },
];

export const DIRECTORY_TYPES = Object.fromEntries(
    DIRECTORY_GROUPS.flatMap((group) => group.types.map((type) => [type.value, type.label]))
);

export const EMPTY_ENTRY = {
    id: null,
    type: "river",
    slug: "",
    title: "",
    region: "",
    summary: "",
    body: "",
    source_url: "",
    geometry_geojson: "",
};

export function validateDirectoryEntry(entry) {
    const errors = [];
    if (!DIRECTORY_TYPES[entry.type]) errors.push("Выберите тип справочного объекта.");
    if (entry.title.trim().length < 3 || entry.title.trim().length > 180) errors.push("Название: от 3 до 180 символов.");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.slug)) errors.push("Адрес (slug): латинские буквы, цифры и дефисы.");
    if (entry.slug.length > 160) errors.push("Slug слишком длинный (не более 160 символов).");
    if (entry.region.length > 160) errors.push("Регион: не более 160 символов.");
    if (entry.summary.length > 500) errors.push("Краткое описание: не более 500 символов.");
    if (entry.body.length > 10000) errors.push("Основной текст: не более 10000 символов.");
    if (entry.source_url && !/^https?:\/\/[^\s]+$/i.test(entry.source_url)) errors.push("Укажите HTTP(S)-ссылку на источник.");
    if (entry.geometry_geojson.trim()) {
        try {
            parseDirectoryGeoJSON(entry.geometry_geojson, entry.type);
        } catch (error) {
            errors.push(error.message);
        }
    }
    return errors;
}
