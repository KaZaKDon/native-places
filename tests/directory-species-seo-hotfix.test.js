import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const router = read('seo-router.php');
const sitemap = read('sitemap.php');
test('species SEO handler is included before generic directory matcher', () => {
  assert.match(router, /require_once __DIR__ \. '\/seo\/species\.php'/);
  const species = router.indexOf('seoSpeciesShow(');
  const generic = router.indexOf("preg_match('#^/directory/([a-z_]+)/([a-z0-9-]+)$#'");
  assert.ok(species > 0 && generic > species, `handler=${species}, generic=${generic}`);
});
test('species SEO has published-only model, 404 for unpublished, indexable published metadata', () => {
  assert.match(router,/seoSpeciesShow\(seoGetDatabaseConnection\(\), \$slug\)/);
  assert.match(router,/if \(\$fish === null\) \{\s*seoRenderNotFound\(\$path\)/);
  assert.match(router,/seoSpeciesSnapshot\(\$fish\)/);
  assert.match(router,/index, follow, max-image-preview:large/);
  assert.match(router,/server-seo\/species/);
});
test('river source HTML includes public fish links with graceful fallback', () => {
  assert.match(router,/seoSpeciesOfEntry\(/);
  assert.match(router,/seoDirectorySnapshotEntry\(\$entry, \$fishOfEntry\)/);
  assert.match(router,/server-seo\/river-species/);
});
test('sitemap only includes eligible species and their published cover images', () => {
  assert.match(sitemap,/require_once __DIR__ \. '\/seo\/species\.php'/);
  assert.match(sitemap,/seoSpeciesPublishedList\(/);
  assert.match(sitemap,/\/directory\/species\//);
  assert.match(sitemap,/cover_image_id/);
});
test('hotfix does not modify routes for paid ads',()=>{
  assert.match(router,/seoGetPublishedPlace\(/);
  assert.match(router,/seoGetCategoryPlaces\(/);
  assert.match(sitemap,/seoGetPublishedPlacesForSitemap\(/);
});
