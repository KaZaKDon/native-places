import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = f => readFileSync(new URL(`../${f}`, import.meta.url),'utf8');
const host = f => read(`docs/backend/${f}.md`);

test('publishing a species requires admin CSRF and atomic transaction',()=>{
  const code=host('admin/directory/species/publication.php');
  assert.match(code,/directoryRequireMethod\('POST'\)/);
  assert.match(code,/requireAdmin\(\)/);
  assert.match(code,/directoryAssertCsrf\(\$input\)/);
  assert.match(code,/beginTransaction\(\)/);
  assert.match(code,/published_at=NOW/);
  assert.match(code,/directory_species_events/);
  assert.match(code,/commit\(\)/);
  assert.match(code,/rollBack\(\)/);
});
test('publication checks published rivers, evidence, source type and media provenance',()=>{
  const code=host('admin/directory/species/publication.php');
  assert.match(code,/entry_status.*published/);
  assert.match(code,/verified_observation/);
  assert.match(code,/source_kind/);
  assert.match(code,/notes/);
  assert.match(code,/author/);
  assert.match(code,/license_name/);
  assert.match(code,/status='published'/);
  assert.match(code,/status='draft'/);
});
test('public image requires published species, published media and published parent evidence',()=>{
  const img=host('directory/image.php');
  assert.match(img,/m\.status='published'/);
  assert.match(img,/s\.status='published'/);
  assert.match(img,/e\.status='published'/);
  assert.match(img,/o\.status='published'/);
  assert.match(img,/Cache-Control: no-store/);
  assert.doesNotMatch(img,/requireAdmin\(/);
});
test('species public API excludes unpublished records and draft segment names',()=>{
  const show=host('directory/species/show.php');
  assert.match(show,/s\.status='published'/);
  assert.match(show,/e\.status='published'/);
  assert.match(show,/o\.status='published'/);
  assert.match(show,/CASE WHEN seg\.status='published'/);
  assert.doesNotMatch(show,/src\.comment|o\.notes/);
  const entry=host('directory/show.php');
  assert.match(entry,/s\.status='published'/);
  assert.match(entry,/o\.status='published'/);
});
test('SEO canonical and Sitemap are publication gated',()=>{
  const router=read('seo-router.php');
  assert.match(router,/seoSpeciesShow/);
  assert.match(router,/seoRenderNotFound\(\$path\)/);
  assert.ok(router.indexOf('seoSpeciesShow(') < router.indexOf("preg_match('#^\/directory\/([a-z_]+)"));
  const sitemap=read('sitemap.php');
  assert.match(sitemap,/seoSpeciesPublishedList/);
  assert.match(sitemap,/directory\/species\//);
  const sp=read('docs/seo/species.php');
  assert.match(sp,/status='published'/);
});
test('source and host patches remain separate from paid listings',()=>{
  const files=[host('admin/directory/species/publication.php'),host('directory/species/show.php'),host('directory/image.php')];
  for(const f of files) assert.doesNotMatch(f,/INSERT INTO places|UPDATE places|payments/i);
  const sql=read('docs/backend/migrations/20261117_directory_species_publication_v04c.sql.md');
  assert.match(sql,/CREATE TABLE IF NOT EXISTS directory_species_events/);
  assert.doesNotMatch(sql,/ALTER TABLE|DROP TABLE|TRUNCATE TABLE/i);
});
