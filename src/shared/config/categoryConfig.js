export const MAP_CATEGORY_ALL = "all";

export const mapCategories = [
    { id: MAP_CATEGORY_ALL, title: "Все" },
    { id: "real-estate", title: "Недвижимость" },
    { id: "rent", title: "Аренда" },
    { id: "recreation", title: "Базы отдыха" },
    { id: "fishing", title: "Рыбалка" },
    { id: "hunting", title: "Охота" },
    { id: "nature", title: "Природа" },
];

export const categoryCards = [
    {
        id: "real-estate",
        title: "Недвижимость",
        description: "Дома, участки и загородные объекты у воды и природы.",
    },
    {
        id: "rent",
        title: "Аренда",
        description: "Дома, гостиницы, глэмпинги и места для временного отдыха.",
    },
    {
        id: "recreation",
        title: "Базы отдыха",
        description: "Базы, туркомплексы и места для отдыха на природе.",
    },
    {
        id: "fishing",
        title: "Рыбалка",
        description: "Реки, водоемы, берега и места для рыбалки.",
    },
    {
        id: "hunting",
        title: "Охота",
        description: "Охотничьи территории, базы и природные зоны.",
    },
    {
        id: "nature",
        title: "Природа",
        description: "Озера, степи, леса и природные достопримечательности.",
    },
];

export function getMapCategoryById(categoryId) {
    return mapCategories.find((category) => category.id === categoryId) ?? null;
}

export function isKnownMapCategory(categoryId) {
    return Boolean(getMapCategoryById(categoryId));
}