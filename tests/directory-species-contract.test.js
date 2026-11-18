import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = f => readFileSync(new URL(`../${f}`, import.meta.url),'utf8');
const host = f => read(`docs/backend/${f}.md`);
const sql = () => read('docs/backend/migrations/20261116_directory_species_media_v04b.sql.md');

test('migration creates four isolated draft tables with real FKs',()=>{
  const content=sql();
  assert.equal((content.match(/CREATE TABLE IF NOT EXISTS/g)||[]).length,4);
  assert.match(content,/directory_species_occurrences/);
  assert.match(content,/FOREIGN KEY \(segment_id\) REFERENCES directory_segments\(id\)/);
  assert.match(content,/FOREIGN KEY \(species_id\) REFERENCES directory_species\(id\)/);
  assert.doesNotMatch(content,/\b(?:ALTER|DROP|TRUNCATE)\s+(?:TABLE|DATABASE)/i);
});
test('all new writes use admin session and directory CSRF',()=>{
  for (const path of ['admin/directory/species/save.php','admin/directory/occurrences/save.php','admin/directory/media/upload.php','admin/directory/media/delete.php','admin/directory/occurrences/delete.php']) {
    const code=host(path);
    assert.match(code,/requireAdmin\(\)/,path);
    assert.match(code,/directoryAssertCsrf\(/,path);
  }
});
test('observations enforce source type and segment actually belongs to river',()=>{
  const code=host('admin/directory/occurrences/save.php');
  assert.match(code,/river_entry_id/);
  assert.match(code,/source_kind/);
  assert.match(code,/OSM не доказывает/);
  assert.match(code,/segment_id <=> :segment/);
  assert.match(code,/status.*draft/s);
});
test('uploads are access-controlled and never served as public files',()=>{
  const u=host('admin/directory/media/upload.php');
  assert.match(u,/is_uploaded_file/);
  assert.match(u,/imagecreatefromstring/);
  assert.match(u,/imagewebp/);
  assert.match(u,/rights_confirmed/);
  assert.match(u,/image_data/);
  assert.doesNotMatch(u,/move_uploaded_file|public\/uploads|\.htaccess/);
  const img=host('admin/directory/media/image.php');
  assert.match(img,/requireAdmin\(\)/);
  assert.match(img,/private, no-store/);
});
test('admin draft writes still cannot auto-publish species',()=>{
  const s=host('admin/directory/species/save.php');
  const o=host('admin/directory/occurrences/save.php');
  assert.match(s,/['"]draft['"]/);
  assert.match(o,/['"]draft['"]/);
  assert.doesNotMatch(s+o,/UPDATE places|INSERT INTO places|payments/);
  const router=read('src/app/router.jsx');
  // New public route is permitted only with server-side draft filtering.
  assert.match(router,/directory\/species\/.*slug/);
});
test('admin has dedicated fish tab and API',()=>{
  assert.match(read('admin/src/pages/Directory/DirectoryPage.jsx'),/Виды рыб/);
  assert.match(read('admin/src/shared/api/directoryApi.js'),/directorySpeciesApi/);
  assert.match(read('admin/src/pages/Directory/species/SpeciesEditor.jsx'),/Привязать к реке или участку/);
});
