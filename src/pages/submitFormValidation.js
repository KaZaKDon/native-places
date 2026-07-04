export function validateSubmitForm({
    title,
    categoryId,
    placeTypeId,
    localityId,
    hasLocation,
    planId,
    requiresPlan = false,
}) {
    if (!String(title ?? "").trim()) {
        return "Укажите название объекта.";
    }

    if (!categoryId) {
        return "Не удалось определить категорию объекта.";
    }

    if (!placeTypeId) {
        return "Не удалось определить тип объекта.";
    }

    if (!Number(localityId || 0)) {
        return "Выберите населённый пункт.";
    }

    if (!hasLocation) {
        return "Укажите точку на карте.";
    }

    if (requiresPlan && !Number(planId || 0)) {
        return "Выберите тариф размещения.";
    }
    
    return "";
}
