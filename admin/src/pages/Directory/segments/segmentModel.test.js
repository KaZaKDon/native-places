import test from "node:test";
import assert from "node:assert/strict";
import { EMPTY_SEGMENT, EMPTY_SOURCE, toSegmentForm, validateSegment, validateSource } from "./segmentModel.js";

const rivers = [{ id: 1, title: "Дон", type: "river", status: "published" }, { id: 2, title: "озеро", type: "lake" }];
const draft = () => ({ ...EMPTY_SEGMENT, river_entry_id: "1", slug: "vyoshenskaya", title: "Вёшенской участок" });

test("valid draft may omit description and GeoJSON", () => {
    assert.deepEqual(validateSegment(draft(), rivers), []);
});
test("valid source and line GeoJSON", () => {
    const item = { ...draft(), geometry_geojson: JSON.stringify({ type: "LineString", coordinates: [[41.5,49.6],[41.6,49.61]] }), geometry_source_id: "3" };
    assert.deepEqual(validateSegment(item, rivers), []);
});
test("cannot select a lake as parent river", () => {
    assert.match(validateSegment({ ...draft(), river_entry_id: "2" }, rivers).join(" "), /реку/);
});
test("cannot select missing parent river", () => {
    assert.notEqual(validateSegment({ ...draft(), river_entry_id: "999" }, rivers).length, 0);
});
test("invalid slug, order, short title rejected", () => {
    const errors = validateSegment({ ...draft(), slug: "Русло", title: "x", sort_order: "-2" }, rivers);
    assert.equal(errors.length, 3);
});
test("polygon GeoJSON rejected for river segment", () => {
    const errors = validateSegment({ ...draft(), geometry_geojson: JSON.stringify({ type: "Polygon", coordinates: [[[41,49],[42,49],[42,50],[41,49]]] }) }, rivers);
    assert.match(errors.join(" "), /LineString/);
});
test("editing form retains source id, geometry and sort order as strings", () => {
    const result = toSegmentForm({ ...draft(), id: 4, sort_order: 8, geometry_source_id: 3, geometry_geojson: '{"type":"LineString"}' });
    assert.equal(result.geometry_source_id, "3");
    assert.equal(result.sort_order, "8");
    assert.equal(result.geometry_geojson, '{"type":"LineString"}');
});
test("source requires real date but allows omitted URL for books and personal observations", () => {
    const valid = { ...EMPTY_SOURCE, title: "Река Дон — OSM way", url: "https://www.openstreetmap.org/way/123", accessed_at: "2026-11-16" };
    assert.deepEqual(validateSource(valid), []);
    assert.deepEqual(validateSource({ ...valid, source_kind: "scientific", title: "Печатный справочник рыб", url: "", publisher: "Автор" }), []);
    assert.deepEqual(validateSource({ ...valid, source_kind: "observation", title: "Личное наблюдение", url: "  " }), []);
    assert.deepEqual(validateSource({ ...valid, source_kind: "official", title: "Бумажный отчёт", url: "" }), []);
    assert.match(validateSource({ ...valid, accessed_at: "2026-02-30" }).join(" "), /дату/);
    assert.match(validateSource({ ...valid, url: "file:///tmp/info" }).join(" "), /HTTP/);
});
