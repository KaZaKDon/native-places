import { parseDirectoryGeoJSON } from "../geojson.js";

export const EMPTY_SEGMENT = Object.freeze({
    id: null, river_entry_id: "", slug: "", title: "", sort_order: "0", locality: "",
    summary: "", body: "", geometry_geojson: "", geometry_source_id: "",
});

export const EMPTY_SOURCE = Object.freeze({
    title: "", source_kind: "osm", publisher: "", url: "",
    accessed_at: new Date().toISOString().slice(0, 10), published_on: "",
    license_name: "", license_url: "", comment: "",
});

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SOURCE_KINDS = [
    { value: "osm", label: "Картографические данные (OSM)" },
    { value: "official", label: "Официальный документ" },
    { value: "scientific", label: "Научный источник" },
    { value: "licensed_media", label: "Медиа / лицензия" },
    { value: "observation", label: "Проверенное наблюдение" },
    { value: "other", label: "Другой источник" },
];

export function toSegmentForm(item) {
    return {
        ...EMPTY_SEGMENT, ...item, river_entry_id: String(item.river_entry_id),
        sort_order: String(item.sort_order ?? 0),
        geometry_source_id: item.geometry_source_id ? String(item.geometry_source_id) : "",
        geometry_geojson: item.geometry_geojson || "",
    };
}

export function validateSegment(form, rivers) {
    const errors = [];
    const river = rivers.find((r) => Number(r.id) === Number(form.river_entry_id) && r.type === "river");
    if (!river) errors.push("Выберите существующую реку.");
    if (!SLUG.test(form.slug || "") || form.slug.length > 160) errors.push("Slug: только латиница, цифры и дефис (до 160 знаков).");
    if (form.title?.trim().length < 3 || form.title?.trim().length > 180) errors.push("Название: 3–180 символов.");
    if ((form.locality || "").length > 180) errors.push("Ориентир: максимум 180 символов.");
    if ((form.summary || "").length > 500) errors.push("Краткое описание: максимум 500 символов.");
    if ((form.body || "").length > 10_000) errors.push("Подробный текст: максимум 10 000 символов.");
    if (!/^\d+$/.test(String(form.sort_order)) || Number(form.sort_order) > 100_000) errors.push("Порядок: целое число от 0 до 100 000.");
    if (form.geometry_geojson?.trim()) {
        try { parseDirectoryGeoJSON(form.geometry_geojson, "river"); }
        catch (error) { errors.push(error.message); }
    }
    if (form.geometry_source_id && (!/^\d+$/.test(String(form.geometry_source_id)) || Number(form.geometry_source_id) < 1)) {
        errors.push("Некорректный источник геометрии.");
    }
    return errors;
}

export function validateSource(form) {
    const errors = [];
    if ((form.title || "").trim().length < 3 || form.title.trim().length > 250) errors.push("Название источника: 3–250 символов.");
    if (!SOURCE_KINDS.some((kind) => kind.value === form.source_kind)) errors.push("Выберите тип источника.");
    if ((form.publisher || "").length > 250) errors.push("Издатель: максимум 250 символов.");
    if ((form.comment || "").length > 2_000) errors.push("Комментарий: максимум 2000 символов.");
    const sourceUrl = typeof form.url === "string" ? form.url.trim() : "";
    if (sourceUrl) {
        try { const u = new URL(sourceUrl); if (!["https:", "http:"].includes(u.protocol) || sourceUrl.length > 1000) throw new Error(); }
        catch { errors.push("Если URL указан, нужна корректная ссылка HTTP(S) до 1000 символов."); }
    }
    if (!isDate(form.accessed_at)) errors.push("Укажите действительную дату проверки источника.");
    if (form.published_on && !isDate(form.published_on)) errors.push("Дата публикации источника некорректна.");
    if ((form.license_name || "").length > 180) errors.push("Лицензия: максимум 180 символов.");
    if (form.license_url) {
        try { const u = new URL(form.license_url); if (!["http:", "https:"].includes(u.protocol) || form.license_url.length > 1000) throw new Error(); }
        catch { errors.push("Ссылка лицензии некорректна."); }
    }
    return errors;
}

function isDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
