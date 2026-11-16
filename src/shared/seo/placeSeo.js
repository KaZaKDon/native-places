import { normalizeSeoText } from "./seoConfig.js";

/** Titles and descriptions for public, approved places only. */
export function createPlaceSeo(place) {
    const title = normalizeSeoText(place.title, "Объект");
    const location = normalizeSeoText(
        place.localityTitle || place.localityRegion ||
        (place.locality && place.locality !== place.address ? place.locality : "")
    );
    const category = normalizeSeoText(place.categoryTitle, "Объявление");
    const summary = normalizeSeoText(
        place.shortDescription || place.fullDescription || place.description,
        category
    );
    const hasLocationInTitle = location &&
        title.toLocaleLowerCase("ru-RU").includes(location.toLocaleLowerCase("ru-RU"));
    const hasLocationInSummary = location &&
        summary.toLocaleLowerCase("ru-RU").includes(location.toLocaleLowerCase("ru-RU"));

    return {
        title: `${title}${location && !hasLocationInTitle ? ` — ${location}` : ""} | Native Places`,
        description: `${summary}${location && !hasLocationInSummary ? ` Населённый пункт: ${location}.` : ""} Сведения об объекте и расположение на карте.`,
    };
}
