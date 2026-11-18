import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("Both source entry forms accept offline references without URL", () => {
  for (const path of [
    "admin/src/pages/Directory/segments/SegmentsEditor.jsx",
    "admin/src/pages/Directory/species/SpeciesEditor.jsx"
  ]) {
    const form = read(path);
    assert.match(form, /URL источника \(необязательно\)/, path);
    assert.doesNotMatch(form, /URL источника \*<input[^>]*required/, path);
    assert.match(form, /библиографические реквизиты/, path);
  }
});

test("PHP accepts missing URL, validates nonempty URL, and does not reuse empty URL", () => {
  const php = read("docs/backend/admin/directory/sources/save.php.md");
  assert.match(php, /sourcesUrl\(\$input, 'url', false\)/);
  assert.match(php, /if \(\$url !== ''\)/);
  assert.match(php, /requireAdmin\(\)/);
  assert.match(php, /directoryAssertCsrf\(\$input\)/);
  assert.match(php, /INSERT INTO directory_sources/);
});
