import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const code = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('fauna occurrences require a matching protected territory or hunting ground', () => {
    const save = code('api/admin/directory/occurrences/save.php');
    const publication = code('api/admin/directory/species/publication.php');
    assert.match(save, /\$species\['kind'\] === 'fish'.*\['river','lake'\]/);
    assert.match(save, /\['bird','mammal'\].*\['protected_area','hunting_ground'\]/s);
    assert.match(save, /source_kind/);
    assert.match(save, /segment_id <=> :segment/);
    assert.match(publication, /\$allowedEntries = \$species\['kind'\] === 'fish' \? \['river','lake'\] : \['protected_area','hunting_ground'\]/);
    assert.match(publication, /entry_status'\] !== 'published'/);
    assert.match(publication, /\$o\['status'\] !== 'draft'/);
});

test('visitors see only published fauna and evidence, and an unpublished entry has no species page', () => {
    const show = code('api/directory/show.php');
    const species = code('api/directory/species/show.php');
    const seo = code('docs/seo/species.php');
    assert.match(show, /s\.kind IN \('bird','mammal'\)/);
    assert.match(show, /o\.status='published'/);
    assert.match(species, /s\.kind IN \('fish','bird','mammal'\)/);
    assert.match(species, /e\.status='published'/);
    assert.doesNotMatch(species, /src\.comment|o\.notes/);
    assert.match(seo, /e\.status='published'/);
    assert.match(seo, /s\.kind IN \('fish','bird','mammal'\)/);
});

test('hunting season text has a sourced publication gate; reserve regime differs in React and SEO', () => {
    const gate = code('docs/backend/v04e/api/admin/directory/_territory.php');
    const form = code('admin/src/pages/Directory/TerritoryFields.jsx');
    const react = code('src/pages/DirectoryEntryPage.jsx');
    const seo = code('docs/seo/directory.php');
    assert.match(gate, /access_source_url/);
    assert.match(gate, /checked_at/);
    assert.match(form, /сроки охоты по видам/);
    assert.match(react, /Любительская и промысловая охота.*запрещена/);
    assert.match(react, /Сроки и ограничения охоты/);
    assert.match(seo, /Любительская и промысловая охота.*запрещена/);
    assert.match(seo, /Сроки и ограничения охоты/);
});
