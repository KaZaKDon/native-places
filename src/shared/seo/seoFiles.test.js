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


test("both deployable robots files are identical and allow noindex route discovery", async () => {
    const projectRobots = await readFile("robots.txt", "utf8");
    const publicRobots = await readFile("public/robots.txt", "utf8");

    assert.equal(projectRobots, publicRobots);
    assert.doesNotMatch(projectRobots, /Disallow: \/(auth|account|submit|routes)/);
    assert.match(projectRobots, /Host: native-places\.ru/);
});

test("PHP server meta and SPA fallback share home title/description", async () => {
    const fallback = await readFile("index.html", "utf8");
    const phpConfig = await readFile("docs/seo/config.php", "utf8");
    const clientSeo = await readFile("src/shared/seo/seoConfig.js", "utf8");

    const title = "Native Places — объявления и справочник природных мест";
    const description = "Native Places: бесплатный справочник рек и природных мест, карта, объявления о недвижимости, аренде и отдыхе. Начните с Ростовской области.";

    for (const content of [fallback, phpConfig, clientSeo]) {
        assert.ok(content.includes(title));
        assert.ok(content.includes(description));
    }
});

test("rewrites use a single canonical HTTPS host and fail closed on category DB errors", async () => {
    const htaccess = await readFile(".htaccess", "utf8");
    const router = await readFile("seo-router.php", "utf8");

    assert.match(htaccess, /\^www\\\.native-places/);
    assert.match(htaccess, /RewriteCond %\{HTTPS\} !=on/);
    assert.match(htaccess, /https:\/\/native-places\.ru%\{REQUEST_URI\}/);
    assert.match(router, /\[server-seo\/category\]/);
    assert.match(router, /'robots' => 'noindex, nofollow, noarchive'/);
    assert.match(router, /503/);
});

test("server and visible frontend home both contain category links", async () => {
    const home = await readFile("src/pages/HomePage.jsx", "utf8");
    const snapshot = await readFile("docs/seo/snapshots.php", "utf8");

    assert.match(home, /categoryCards\.map/);
    assert.match(home, /\/category\/\$\{category\.id\}/);
    assert.match(snapshot, /seoCategoriesSnapshotCards\(\)/);
});
