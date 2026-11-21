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
            { value: "protected_area", label: "Заповедник или ООПТ" },
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
    official_category: "",
    official_name: "",
    managing_body: "",
    legal_basis_url: "",
    boundary_source_url: "",
    access_rules: "",
    access_source_url: "",
    checked_at: "",
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
    if (["protected_area", "hunting_ground"].includes(entry.type)) {
        for (const field of ["official_name", "managing_body", "legal_basis_url", "boundary_source_url", "access_rules", "access_source_url", "checked_at"]) {
            if (typeof entry[field] !== "string") errors.push(`Некорректное поле: ${field}.`);
        }
        if (entry.type === "protected_area" && entry.official_category && !["zapovednik", "zakaznik", "national_park", "natural_park", "nature_monument", "other"].includes(entry.official_category)) {
            errors.push("Укажите категорию ООПТ.");
        }
        for (const field of ["legal_basis_url", "boundary_source_url", "access_source_url"]) {
            if (entry[field] && !/^https?:\/\/[^\s]+$/i.test(entry[field])) errors.push(`Укажите HTTP(S)-ссылку: ${field}.`);
        }
        const limits = { official_name: 180, managing_body: 180, legal_basis_url: 700, boundary_source_url: 700, access_rules: 5000, access_source_url: 700 };
        for (const [field, limit] of Object.entries(limits)) {
            if (typeof entry[field] === "string" && entry[field].length > limit) errors.push(`Поле ${field} слишком длинное.`);
        }
    }
    return errors;
}
