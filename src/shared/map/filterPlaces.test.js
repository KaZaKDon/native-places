import test from "node:test";
import assert from "node:assert/strict";

import { filterPlaces } from "./filterPlaces.js";

const places = [
    {
        id: 1,
        title: "Дом в Вёшенской",
        categorySlug: "real-estate",
        typeSlug: "house",
        localityId: 3,
        localitySlug: "vyoshenskaya",
        localityTitle: "Вёшенская",
        localityDistrict: "Шолоховский район",
        description: "Дом у реки",
        tags: ["Вёшенская", "Дом"],
    },
    {
        id: 2,
        title: "Квартира в Шахтах",
        categorySlug: "real-estate",
        typeSlug: "apartment",
        localityId: 1,
        localitySlug: "shahty",
        localityTitle: "Шахты",
        description: "Квартира рядом с центром",
        tags: ["Шахты", "Квартира"],
    },
    {
        id: 3,
        title: "База отдыха",
        categorySlug: "recreation",
        typeSlug: "recreation_base",
        localityId: 2,
        localitySlug: "rostov-na-donu",
        localityTitle: "Ростов-на-Дону",
        description: "Отдых на природе",
        tags: ["Ростов-на-Дону", "База отдыха"],
    },
];

test("filters places by locality slug", () => {
    const result = filterPlaces(places, { locality: "shahty" });

    assert.deepEqual(result.map((place) => place.id), [2]);
});

test("filters places by type", () => {
    const result = filterPlaces(places, { type: "house" });

    assert.deepEqual(result.map((place) => place.id), [1]);
});

test("filters places by category, locality and type together", () => {
    const result = filterPlaces(places, {
        category: "real-estate",
        locality: "vyoshenskaya",
        type: "house",
    });

    assert.deepEqual(result.map((place) => place.id), [1]);
});

test("matches locality object keywords for readable locality data", () => {
    const result = filterPlaces(places, {
        locality: {
            value: "missing-slug",
            title: "Вёшенская",
            districtTitle: "Шолоховский район",
        },
    });

    assert.deepEqual(result.map((place) => place.id), [1]);
});
