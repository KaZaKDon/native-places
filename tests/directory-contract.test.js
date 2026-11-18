import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
// PHP executes on hosting; the local project stores PHP source mirrors under docs/backend/.
const text = (path) => {
    if (path.startsWith("api/")) return readFile(`docs/backend/${path.slice(4)}.md`, "utf8");
    if (path === "seo/directory.php") return readFile("docs/seo/directory.php", "utf8");
    return readFile(path, "utf8");
};

test("public endpoints and SEO/sitemap only read published data", async () => {
    for (const path of ["api/directory/index.php", "api/directory/show.php", "api/directory/map.php", "seo/directory.php"]) {
        const code = await text(path);
        assert.match(code, /status\s*=\s*'published'/i, path);
        assert.doesNotMatch(code, /SELECT[^;]*created_by_admin_id/i, path);
    }
    const sitemap = await text("sitemap.php");
    assert.match(sitemap, /seoDirectoryList/);
    assert.match(sitemap, /seoDirectoryUrl/);
});
test("publication requires administrator auth, CSRF and audit event", async () => {
    const code = await text("api/admin/directory/publication.php");
    assert.match(code, /requireAdmin\(\)/);
    assert.match(code, /directoryAssertCsrf\(\$payload\)/);
    assert.match(code, /FOR UPDATE/);
    assert.match(code, /directory_entry_events/);
    assert.match(code, /mb_strlen\(\$body/);
    assert.match(code, /unpublish/);
});
test("directory SSR returns genuine 404 for drafts or unknown URL", async () => {
    const router = await text("seo-router.php");
    assert.match(router, /seoDirectoryShow/);
    assert.match(router, /if \(\$entry === null\)/);
    assert.match(router, /seoRenderNotFound\(\$path\)/);
    assert.match(router, /503/);
});
test("homepage has three buttons; first and third share the same primary CSS", async () => {
    const home = await text("src/pages/HomePage.jsx");
    assert.match(home, /to="\/directory"/);
    assert.match(home, /to="\/map"/);
    assert.match(home, /to="\/categories"/);
    assert.equal((home.match(/className="hero__button hero__button--primary"/g) ?? []).length, 2);
});
test("existing advertisements and billing endpoints are not modified", async () => {
    const contracts = await text("src/shared/api/directoryApi.js");
    assert.doesNotMatch(contracts, /payments|\/places\//);
    const map = await text("src/widgets/MapView/MapView.jsx");
    assert.match(map, /DirectoryMapShapes/);
    assert.match(map, /places\.map/);
});
