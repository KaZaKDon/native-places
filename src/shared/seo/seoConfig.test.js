import assert from "node:assert/strict";
import test from "node:test";

import {
    createBreadcrumbStructuredData,
    normalizeSeoText,
    toAbsoluteSiteUrl,
    truncateSeoText,
} from "./seoConfig.js";

test("converts relative paths to canonical absolute URLs", () => {
    assert.equal(
        toAbsoluteSiteUrl("category/nature"),
        "https://native-places.ru/category/nature"
    );
    assert.equal(
        toAbsoluteSiteUrl("https://native-places.ru/map"),
        "https://native-places.ru/map"
    );
});

test("normalizes and truncates SEO descriptions", () => {
    assert.equal(
        normalizeSeoText("  Карта   <strong>родных</strong> мест  "),
        "Карта родных мест"
    );

    const result = truncateSeoText("Одно два три четыре пять шесть", 18);

    assert.ok(result.length <= 18);
    assert.ok(result.endsWith("…"));
});

test("creates ordered breadcrumb structured data", () => {
    const breadcrumbs = createBreadcrumbStructuredData([
        { name: "Главная", path: "/" },
        { name: "Природа", path: "/category/nature" },
    ]);

    assert.equal(breadcrumbs["@type"], "BreadcrumbList");
    assert.equal(breadcrumbs.itemListElement[1].position, 2);
    assert.equal(
        breadcrumbs.itemListElement[1].item,
        "https://native-places.ru/category/nature"
    );
});
