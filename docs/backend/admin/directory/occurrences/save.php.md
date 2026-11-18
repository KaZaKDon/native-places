# api/admin/directory/occurrences/save.php

**Статус:** код подготовлен для хостинга в v0.4b; не развёрнут. Локально только текстовая копия PHP.

```php
<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';
directoryRequireMethod('POST');
$admin = requireAdmin();
$input = speciesInput();
directoryAssertCsrf($input);
$id = speciesId($input['id'] ?? null, 'id', true);
$speciesId = speciesId($input['species_id'] ?? null, 'species_id');
$entryId = speciesId($input['entry_id'] ?? null, 'entry_id');
$segmentId = speciesId($input['segment_id'] ?? null, 'segment_id', true);
$sourceId = speciesId($input['source_id'] ?? null, 'source_id');
$evidence = directoryString($input, 'evidence_level', 24);
if (!in_array($evidence, ['official','research','verified_observation'], true)) errorResponse('Недопустимый уровень подтверждения', 422);
$notes = directoryString($input, 'notes', 2000);
$date = occurrenceDate($input);
try {
    $pdo = getDatabaseConnection();
    $pdo->beginTransaction();
    $s = $pdo->prepare('SELECT id,kind,status FROM directory_species WHERE id=:id FOR UPDATE');
    $s->execute(['id'=>$speciesId]);
    $species = $s->fetch();
    if (!$species) { $pdo->rollBack(); errorResponse('Вид не найден', 422); }
    $e = $pdo->prepare('SELECT id,type FROM directory_entries WHERE id=:id FOR UPDATE');
    $e->execute(['id'=>$entryId]);
    $entry = $e->fetch();
    if (!$entry) { $pdo->rollBack(); errorResponse('Природный объект не найден', 422); }
    if ($species['kind'] === 'fish' && !in_array($entry['type'], ['river','lake'], true)) {
        $pdo->rollBack(); errorResponse('Рыбу можно связать только с рекой или водоёмом', 422);
    }
    if ($segmentId !== null) {
        $seg = $pdo->prepare('SELECT river_entry_id FROM directory_segments WHERE id=:id');
        $seg->execute(['id'=>$segmentId]);
        $segment = $seg->fetch();
        if (!$segment || (int)$segment['river_entry_id'] !== $entryId || $entry['type'] !== 'river') {
            $pdo->rollBack(); errorResponse('Участок не принадлежит выбранной реке', 422);
        }
    }
    $src = $pdo->prepare('SELECT id, source_kind FROM directory_sources WHERE id=:id');
    $src->execute(['id'=>$sourceId]);
    $source = $src->fetch();
    if (!$source) { $pdo->rollBack(); errorResponse('Источник сведений не найден', 422); }
    $expectedKind = ['official'=>'official', 'research'=>'scientific', 'verified_observation'=>'observation'][$evidence];
    if ($source['source_kind'] !== $expectedKind) {
        $pdo->rollBack(); errorResponse('Тип источника не соответствует уровню подтверждения; OSM не доказывает наличие рыбы', 422);
    }
    // Locking the entry above serializes same-entry inserts; use NULL-safe comparison for whole-river rows.
    $dup = $pdo->prepare('SELECT id FROM directory_species_occurrences WHERE species_id=:species AND entry_id=:entry AND segment_id <=> :segment AND id<>:id LIMIT 1');
    $dup->execute(['species'=>$speciesId,'entry'=>$entryId,'segment'=>$segmentId,'id'=>$id ?? 0]);
    if ($dup->fetch()) { $pdo->rollBack(); errorResponse('Такая связь вида с объектом или участком уже есть', 409); }
    if ($id !== null) {
        $check = $pdo->prepare('SELECT species_id,status FROM directory_species_occurrences WHERE id=:id FOR UPDATE');
        $check->execute(['id'=>$id]);
        $existing = $check->fetch();
        if (!$existing) { $pdo->rollBack(); errorResponse('Связь не найдена', 404); }
        if ($existing['status'] !== 'draft' || (int)$existing['species_id'] !== $speciesId) {
            $pdo->rollBack(); errorResponse('Изменение этой связи запрещено', 409);
        }
        $update = $pdo->prepare('UPDATE directory_species_occurrences SET entry_id=:entry,segment_id=:segment,source_id=:source,evidence_level=:evidence,notes=:notes,verified_at=:date WHERE id=:id');
        $update->execute(['entry'=>$entryId,'segment'=>$segmentId,'source'=>$sourceId,'evidence'=>$evidence,'notes'=>$notes,'date'=>$date,'id'=>$id]);
    } else {
        $insert = $pdo->prepare("INSERT INTO directory_species_occurrences (species_id,entry_id,segment_id,source_id,evidence_level,notes,verified_at,status,created_by_admin_id) VALUES (:species,:entry,:segment,:source,:evidence,:notes,:date,'draft',:admin)");
        $insert->execute(['species'=>$speciesId,'entry'=>$entryId,'segment'=>$segmentId,'source'=>$sourceId,'evidence'=>$evidence,'notes'=>$notes,'date'=>$date,'admin'=>(int)$admin['id']]);
        $id = (int)$pdo->lastInsertId();
    }
    $pdo->commit();
    header('Cache-Control: no-store');
    successResponse(['occurrence'=>['id'=>$id,'species_id'=>$speciesId,'entry_id'=>$entryId,'segment_id'=>$segmentId,'status'=>'draft']]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    error_log('[directory/occurrences/save] ' . $e->getMessage());
    errorResponse('Не удалось сохранить связь вида с объектом', 500);
}

```
