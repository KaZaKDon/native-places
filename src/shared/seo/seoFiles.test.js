import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const INDEXABLE_STATIC_URLS = [
    "https://native-places.ru/",
    "https://native-places.ru/categories",
    "https://native-places.ru/category/real-estate",
    "https://native-places.ru/category/rent",
    "https://native-places.ru/category/recreation",
    "https://native-places.ru/category/fishing",
    "https://native-places.ru/category/hunting",
    "https://native-places.ru/category/nature",
    "https://native-places.ru/map",
];

test("static sitemap contains only approved indexable routes", async () => {
    const sitemap = await readFile("public/sitemap.xml", "utf8");
    const urls = Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g))
        .map((match) => match[1]);

    assert.deepEqual(urls, INDEXABLE_STATIC_URLS);
    assert.doesNotMatch(sitemap, /\/auth|\/account|\/submit|\/legal|\/routes/);
});

test("robots points to sitemap and does not block pages with noindex meta", async () => {
    const robots = await readFile("public/robots.txt", "utf8");

    assert.match(robots, /Sitemap: https:\/\/native-places\.ru\/sitemap\.xml/);
    assert.doesNotMatch(robots, /Disallow: \/(auth|account|submit|routes)/);
    assert.match(robots, /Disallow: \/api\//);
    assert.match(robots, /Disallow: \/admin/);
});

test("HTML fallback has one canonical and crawlable default metadata", async () => {
    const html = await readFile("index.html", "utf8");

    assert.equal((html.match(/rel="canonical"/g) ?? []).length, 1);
    assert.match(html, /data-rh="true" name="robots"/);
    assert.match(html, /max-image-preview:large/);
    assert.doesNotMatch(html, /href="\/favicon\.svg"/);
});
