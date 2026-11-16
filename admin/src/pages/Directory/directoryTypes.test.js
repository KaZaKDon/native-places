import assert from "node:assert/strict";
import test from "node:test";
import { DIRECTORY_GROUPS, EMPTY_ENTRY, validateDirectoryEntry } from "./directoryTypes.js";

test("directory taxonomy is separate from paid categories", () => {
    assert.equal(DIRECTORY_GROUPS.length, 4);
    assert.ok(DIRECTORY_GROUPS[0].types.some((type) => type.value === "river"));
});

test("valid directory draft can be saved without geometry", () => {
    assert.deepEqual(validateDirectoryEntry({ ...EMPTY_ENTRY, title: "Река Дон", slug: "don" }), []);
});

test("rejects invalid slug and malformed GeoJSON", () => {
    const errors = validateDirectoryEntry({ ...EMPTY_ENTRY, title: "Река Дон", slug: "Дон", geometry_geojson: "{bad" });
    assert.equal(errors.length, 2);
});
