import assert from "node:assert/strict";
import test from "node:test";

import { createPlaceSeo } from "./placeSeo.js";

test("includes actual locality in place title and description", () => {
    const seo = createPlaceSeo({
        title: "Сдаётся однокомнатная квартира",
        localityTitle: "Новочеркасск",
        categoryTitle: "Аренда",
        shortDescription: "Квартира со всеми удобствами.",
    });

    assert.equal(seo.title, "Сдаётся однокомнатная квартира — Новочеркасск | Native Places");
    assert.match(seo.description, /Квартира со всеми удобствами/);
    assert.match(seo.description, /Населённый пункт: Новочеркасск/);
});

test("avoids repeating locality already present in the place title and description", () => {
    const seo = createPlaceSeo({
        title: "База отдыха в Ростове-на-Дону",
        localityTitle: "Ростове-на-Дону",
        categoryTitle: "Базы отдыха",
        shortDescription: "База отдыха в Ростове-на-Дону у реки.",
    });

    assert.equal((seo.title.match(/Ростове-на-Дону/g) ?? []).length, 1);
    assert.doesNotMatch(seo.description, /Населённый пункт:/);
});

test("uses real category data as fallback rather than inventing a location", () => {
    const seo = createPlaceSeo({ title: "Пример", categoryTitle: "Природа" });

    assert.equal(seo.title, "Пример | Native Places");
    assert.match(seo.description, /^Природа Сведения об объекте/);
    assert.doesNotMatch(seo.description, /Населённый пункт:/);
});
