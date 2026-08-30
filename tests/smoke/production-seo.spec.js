import { expect, test } from "@playwright/test";

const SITE_URL = "https://native-places.ru";

function canonicalFor(path) {
    return path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`;
}

test("публичные страницы возвращают серверный HTML и canonical", async ({
    request,
}) => {
    const paths = [
        "/",
        "/categories",
        "/category/real-estate",
        "/category/rent",
        "/category/recreation",
        "/category/fishing",
        "/category/hunting",
        "/category/nature",
        "/map",
    ];

    for (const path of paths) {
        const response = await request.get(path, { maxRetries: 2 });
        const html = await response.text();

        expect(response.status(), `${path}: HTTP status`).toBe(200);
        expect(
            response.headers()["content-type"],
            `${path}: content type`
        ).toContain("text/html");
        expect(html, `${path}: server snapshot`).toContain(
            "server-seo-snapshot"
        );
        expect(html, `${path}: canonical`).toContain(
            `rel="canonical" href="${canonicalFor(path)}"`
        );
    }
});

test("динамический sitemap доступен и содержит публичные разделы", async ({
    request,
}) => {
    const response = await request.get("/sitemap.xml", { maxRetries: 2 });
    const xml = await response.text();

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/xml");
    expect(xml).toContain("<urlset");
    expect(xml).toContain(`<loc>${SITE_URL}/</loc>`);
    expect(xml).toContain(`<loc>${SITE_URL}/categories</loc>`);
    expect(xml).toContain(`<loc>${SITE_URL}/map</loc>`);
    expect(xml).not.toContain("localhost");
    expect(xml).not.toContain("/account");
    expect(xml).not.toContain("/auth");
});

test("первая опубликованная карточка из sitemap открывается", async ({
    request,
}) => {
    const sitemapResponse = await request.get("/sitemap.xml", {
        maxRetries: 2,
    });
    const xml = await sitemapResponse.text();
    const placeUrl = xml.match(/<loc>(https:\/\/native-places\.ru\/place\/[^<]+)<\/loc>/)?.[1];

    test.skip(!placeUrl, "В sitemap пока нет опубликованных карточек");

    const response = await request.get(placeUrl, { maxRetries: 2 });
    const html = await response.text();

    expect(response.status()).toBe(200);
    expect(html).toContain("server-seo-snapshot");
    expect(html).toContain(`rel="canonical" href="${placeUrl}"`);
});

test("неизвестный адрес возвращает настоящий 404 и noindex", async ({
    request,
}) => {
    const response = await request.get(
        "/automated-smoke-test-page-that-must-not-exist",
        { maxRetries: 2 }
    );
    const html = await response.text();

    expect(response.status()).toBe(404);
    expect(response.headers()["x-robots-tag"]).toContain("noindex");
    expect(html).toContain("server-seo-snapshot");
    expect(html).toContain("Ошибка 404");
});

test("служебная страница закрыта от индексации", async ({ request }) => {
    const response = await request.get("/account", { maxRetries: 2 });
    const html = await response.text();

    expect(response.status()).toBe(200);
    expect(response.headers()["x-robots-tag"]).toContain("noindex");
    expect(html).toContain('name="robots" content="noindex');
});

test("старый адрес правил перенаправляется только на HTTPS", async ({
    request,
}) => {
    const response = await request.get("/rules", {
        maxRedirects: 0,
        maxRetries: 2,
    });

    expect(response.status()).toBe(301);
    expect(response.headers().location).toBe(
        `${SITE_URL}/legal/content-rules`
    );
});

test("API не попадает в React Router", async ({ request }) => {
    const response = await request.get("/api/auth/register.php", {
        maxRetries: 2,
    });
    const body = await response.json();

    expect(response.status()).toBe(405);
    expect(response.headers()["content-type"]).toContain("application/json");
    expect(body.success).toBe(false);
    expect(body.message).toBe("Метод запроса не поддерживается");
});
