<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';
directoryRequireMethod('POST');
$admin = requireAdmin();
$input = speciesInput();
directoryAssertCsrf($input);
$id = speciesId($input['id'] ?? null, 'id');
$action = $input['action'] ?? null;
if (!in_array($action, ['publish', 'unpublish'], true)) errorResponse('Недопустимое действие', 422);
try {
    $pdo = getDatabaseConnection();
    $pdo->beginTransaction();
    $stmt = $pdo->prepare('SELECT id,kind,slug,common_name,scientific_name,summary,body,status FROM directory_species WHERE id=:id FOR UPDATE');
    $stmt->execute(['id'=>$id]);
    $species = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$species || $species['kind'] !== 'fish') { $pdo->rollBack(); errorResponse('Вид рыбы не найден', 404); }
    if ($action === 'publish') {
        if ($species['status'] !== 'draft') { $pdo->rollBack(); errorResponse('Опубликовать можно только черновик', 409); }
        $summary = trim((string)$species['summary']);
        $body = trim((string)$species['body']);
        if (mb_strlen($summary, 'UTF-8') < 40 || mb_strlen($body, 'UTF-8') < 120 ||
            mb_strtolower($summary, 'UTF-8') === mb_strtolower($body, 'UTF-8')) {
            $pdo->rollBack(); errorResponse('Для публикации нужны отдельные описание (от 40 знаков) и подробный текст (от 120 знаков)', 422);
        }
        // Lock and validate ALL candidate evidence rows. Do not silently publish invalid information.
        $evidence = $pdo->prepare('SELECT o.id,o.evidence_level,o.verified_at,o.notes,o.status,e.status AS entry_status,e.type AS entry_type,src.source_kind
             FROM directory_species_occurrences o
             JOIN directory_entries e ON e.id=o.entry_id
             JOIN directory_sources src ON src.id=o.source_id
             WHERE o.species_id=:id FOR UPDATE');
        $evidence->execute(['id'=>$id]);
        $occurrences = $evidence->fetchAll(PDO::FETCH_ASSOC);
        if (!$occurrences) { $pdo->rollBack(); errorResponse('Нужен хотя бы один подтверждённый факт присутствия вида', 422); }
        $kinds = ['official'=>'official','research'=>'scientific','verified_observation'=>'observation'];
        foreach ($occurrences as $o) {
            if ($o['status'] !== 'draft' || $o['entry_status'] !== 'published' ||
                !in_array($o['entry_type'], ['river','lake'], true) ||
                ($kinds[$o['evidence_level']] ?? '') !== $o['source_kind'] ||
                !$o['verified_at'] || ($o['evidence_level'] === 'verified_observation' && mb_strlen(trim((string)$o['notes']), 'UTF-8') < 20)) {
                $pdo->rollBack(); errorResponse('Проверьте все источники, заметки личных наблюдений и публикацию родительской реки', 422);
            }
        }
        $media = $pdo->prepare('SELECT m.id,m.status,m.author,m.license_name,m.mime,m.size_bytes
             FROM directory_media_links l JOIN directory_media m ON m.id=l.media_id WHERE l.species_id=:id FOR UPDATE');
        $media->execute(['id'=>$id]);
        $images = $media->fetchAll(PDO::FETCH_ASSOC);
        if (!$images) { $pdo->rollBack(); errorResponse('Перед публикацией добавьте изображение с подтверждёнными правами', 422); }
        foreach ($images as $img) {
            if ($img['status'] !== 'draft' || trim((string)$img['author']) === '' || trim((string)$img['license_name']) === '' ||
                !in_array($img['mime'], ['image/jpeg','image/png','image/webp'], true) || (int)$img['size_bytes'] <= 0) {
                $pdo->rollBack(); errorResponse('Неполные сведения о происхождении изображения', 422);
            }
        }
        $upd = $pdo->prepare("UPDATE directory_species SET status='published', published_at=NOW() WHERE id=:id AND status='draft'");
        $upd->execute(['id'=>$id]);
        $pubOccurrence = $pdo->prepare("UPDATE directory_species_occurrences SET status='published' WHERE species_id=:id AND status='draft'");
        $pubOccurrence->execute(['id'=>$id]);
        $pubMedia = $pdo->prepare("UPDATE directory_media m JOIN directory_media_links l ON l.media_id=m.id SET m.status='published' WHERE l.species_id=:id AND m.status='draft'");
        $pubMedia->execute(['id'=>$id]);
        $status = 'published';
    } else {
        if ($species['status'] !== 'published') { $pdo->rollBack(); errorResponse('Вид ещё не опубликован', 409); }
        // Atomically revoke ALL public relations and images, including for existing deep links.
        $upd = $pdo->prepare("UPDATE directory_species SET status='draft', published_at=NULL WHERE id=:id AND status='published'");
        $upd->execute(['id'=>$id]);
        $pdo->prepare("UPDATE directory_species_occurrences SET status='draft' WHERE species_id=:id AND status='published'")->execute(['id'=>$id]);
        $pdo->prepare("UPDATE directory_media m JOIN directory_media_links l ON l.media_id=m.id SET m.status='draft' WHERE l.species_id=:id AND m.status='published'")->execute(['id'=>$id]);
        $status = 'draft';
    }
    if ($upd->rowCount() !== 1) throw new RuntimeException('Статус не изменён');
    $pdo->prepare('INSERT INTO directory_species_events (species_id,admin_user_id,action) VALUES (:species,:admin,:action)')
        ->execute(['species'=>$id,'admin'=>(int)$admin['id'],'action'=>$action]);
    $pdo->commit();
    header('Cache-Control: no-store');
    successResponse(['species'=>['id'=>$id,'slug'=>$species['slug'],'status'=>$status]]);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    error_log('[directory/species/publication] '.$error->getMessage());
    errorResponse('Не удалось изменить публикацию вида', 500);
}
