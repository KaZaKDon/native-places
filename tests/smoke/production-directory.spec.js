import { expect, test } from "@playwright/test";

test("directory HTML is crawlable even without JavaScript", async ({ request }) => {
    const response = await request.get("/directory");
    const html = await response.text();
    expect(response.status()).toBe(200);
    expect(html).toContain('rel="canonical" href="https://native-places.ru/directory"');
    expect(html).toContain('server-seo-snapshot');
});
test("unpublished/unknown directory entry is a real 404", async ({ request }) => {
    const response = await request.get("/directory/river/this-slug-must-not-exist-729104");
    expect(response.status()).toBe(404);
    expect(response.headers()["x-robots-tag"]).toContain("noindex");
});
test("public directory JSON does not expose drafts or admin IDs", async ({ request }) => {
    const response = await request.get("/api/directory/index.php");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    for (const entry of body.data.entries) {
        expect(entry).not.toHaveProperty("created_by_admin_id");
        expect(entry).not.toHaveProperty("geometry_geojson");
    }
});
test("admin publication endpoint refuses non-authenticated requests", async ({ request }) => {
    const response = await request.post("/api/admin/directory/publication.php", { data: { id: 1, action: "publish" } });
    expect([401, 403]).toContain(response.status());
});
