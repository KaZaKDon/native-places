import assert from "node:assert/strict";
import test from "node:test";
import { DIRECTORY_TYPES, directoryEntryPath, directoryEntryTitle, directoryEntryDescription } from "./directoryConfig.js";

test("directory is independent from the six paid categories", () => {
    assert.equal(Object.keys(DIRECTORY_TYPES).length, 7);
    assert.equal(DIRECTORY_TYPES.river.label, "Река");
    assert.equal(DIRECTORY_TYPES.hunting_ground.group, "Охотничьи угодья");
});
test("public URLs and metadata are deterministic", () => {
    const entry = { type: "river", slug: "don", title: "Река Дон", summary: "Сведения о реке Дон", region: "Ростовская область" };
    assert.equal(directoryEntryPath(entry), "/directory/river/don");
    assert.equal(directoryEntryTitle(entry), "Река Дон — Река | Native Places");
    assert.match(directoryEntryDescription(entry), /Ростовская область/);
});
test("unknown and unsafe URLs never create deep links", () => {
    assert.equal(directoryEntryPath({ type: "river", slug: "../../admin" }), "/directory");
    assert.equal(directoryEntryPath({ type: "unknown", slug: "don" }), "/directory");
});
