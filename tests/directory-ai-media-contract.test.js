import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
test('admin visibly separates photographs and AI-generated illustrations',()=>{
  const ui = read('admin/src/pages/Directory/species/SpeciesEditor.jsx');
  assert.match(ui, /Происхождение изображения/);
  assert.match(ui, /Инструмент ИИ-генерации/);
  assert.match(ui, /не скачан как чужое фото/);
  assert.match(ui, /ИИ-иллюстрация/);
});
test('upload API checks AI origin on the server and keeps old photo clients working',()=>{
  const code = read('docs/backend/admin/directory/media/upload.php.md');
  assert.match(code, /\$_POST\['image_origin'\] \?\? 'photo'/);
  assert.match(code, /in_array\(\$origin, \['photo', 'ai_generated'\]/);
  assert.match(code, /if \(\$origin === 'ai_generated'\)/);
  assert.match(code, /mb_strlen\(\$aiTool/);
  assert.match(code, /\$author = directoryString\(\$_POST, 'author', 250\)/);
  assert.match(code, /directoryAssertCsrf/);
  assert.match(code, /if \(\$author === '' \|\| \$license === ''\)/);
  assert.match(code, /'draft'/);
});
