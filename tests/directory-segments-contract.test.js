import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const host = (file) => {
    const docPath = file.endsWith(".sql")
        ? `docs/backend/migrations/${file.split("/").at(-1)}.md`
        : `docs/backend/${file.slice(4)}.md`;
    return readFileSync(new URL(`../${docPath}`, import.meta.url), "utf8");
};
const source = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("migration adds only two new isolated directory tables", () => {
    const sql = host("db/migrations/20261116_directory_segments_v04a.sql");
    assert.equal((sql.match(/CREATE TABLE IF NOT EXISTS/g)||[]).length, 2);
    assert.match(sql, /UNIQUE KEY ux_directory_segment_river_slug \(river_entry_id,slug\)/);
    assert.match(sql, /FOREIGN KEY \(river_entry_id\) REFERENCES directory_entries\(id\)/);
    assert.doesNotMatch(sql, /(?:ALTER|DROP|TRUNCATE)\s+(?:TABLE|DATABASE)/i);
});

test("segment POST requires admin authentication and existing CSRF", () => {
    const php = host("api/admin/directory/segments/save.php");
    assert.match(php, /requireAdmin\(\)/);
    assert.match(php, /directoryAssertCsrf\(\$input\)/);
    assert.match(php, /\$river\['type'\] !== 'river'/);
    assert.match(host("api/admin/directory/segments/_bootstrap.php"), /directoryGeometry\(\$input, 'river'\)/);
});

test("segment API never creates public route or touches paid places", () => {
    const php = host("api/admin/directory/segments/save.php");
    assert.match(php, /directory_segments/);
    assert.doesNotMatch(php, /INSERT INTO places|UPDATE places|payments/);
    assert.doesNotMatch(source("src/app/router.jsx"), /directory\/.*segment/i);
});

test("sources POST requires CSRF and administrator", () => {
    const php = host("api/admin/directory/sources/save.php");
    assert.match(php, /requireAdmin\(\)/);
    assert.match(php, /directoryAssertCsrf/);
});

test("admin segments editor is separate from paid places", () => {
    const editor = source("admin/src/pages/Directory/segments/SegmentsEditor.jsx");
    assert.match(editor, /GeoJsonEditor/);
    assert.match(editor, /Сохранить черновик участка/);
    assert.doesNotMatch(editor, /Опубликовать участок/);
});
