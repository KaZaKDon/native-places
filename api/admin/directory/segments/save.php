<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';
directoryRequireMethod('POST');
$admin = requireAdmin();
$input = segmentsInput();
directoryAssertCsrf($input);

$id = segmentsPositiveId($input['id'] ?? null, 'id', true);
$riverId = segmentsPositiveId($input['river_entry_id'] ?? null, 'river_entry_id');
$sourceId = segmentsPositiveId($input['geometry_source_id'] ?? null, 'geometry_source_id', true);
$slug = segmentsSlug($input);
$title = directoryString($input, 'title', 180);
if (mb_strlen($title, 'UTF-8') < 3) errorResponse('Название участка должно содержать минимум 3 символа', 422);
$locality = directoryString($input, 'locality', 180);
$summary = directoryString($input, 'summary', 500);
$body = directoryString($input, 'body', 10000);
$sort = filter_var($input['sort_order'] ?? 0, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0, 'max_range' => 100000]]);
if ($sort === false) errorResponse('Порядок должен быть от 0 до 100000', 422);
$geometry = segmentsGeometry($input);

try {
    $pdo = getDatabaseConnection();
    $pdo->beginTransaction();
    $parent = $pdo->prepare('SELECT id, type, status FROM directory_entries WHERE id = :id FOR UPDATE');
    $parent->execute(['id' => $riverId]);
    $river = $parent->fetch();
    if (!$river || $river['type'] !== 'river') {
        $pdo->rollBack();
        errorResponse('Участок можно добавить только к существующей реке', 422);
    }
    if ($sourceId !== null) {
        $sourceStmt = $pdo->prepare('SELECT id FROM directory_sources WHERE id = :id');
        $sourceStmt->execute(['id' => $sourceId]);
        if (!$sourceStmt->fetch()) {
            $pdo->rollBack();
            errorResponse('Источник геометрии не найден', 422);
        }
    }
    if ($id !== null) {
        $lock = $pdo->prepare('SELECT river_entry_id, status FROM directory_segments WHERE id = :id FOR UPDATE');
        $lock->execute(['id' => $id]);
        $existing = $lock->fetch();
        if (!$existing) { $pdo->rollBack(); errorResponse('Участок не найден', 404); }
        if ($existing['status'] !== 'draft') { $pdo->rollBack(); errorResponse('Опубликованный участок изменять нельзя', 409); }
        if ((int) $existing['river_entry_id'] !== $riverId) { $pdo->rollBack(); errorResponse('Перенос участка в другую реку запрещён', 409); }
        $stmt = $pdo->prepare('UPDATE directory_segments SET slug=:slug, title=:title, locality=:locality, sort_order=:sort, summary=:summary, body=:body, geometry_geojson=:geom, geometry_source_id=:source WHERE id=:id');
        $stmt->execute(['slug'=>$slug,'title'=>$title,'locality'=>$locality,'sort'=>$sort,'summary'=>$summary,'body'=>$body,'geom'=>$geometry,'source'=>$sourceId,'id'=>$id]);
        $action = 'segment_update';
    } else {
        $stmt = $pdo->prepare("INSERT INTO directory_segments (river_entry_id, slug, title, locality, sort_order, summary, body, geometry_geojson, geometry_source_id, status, created_by_admin_id) VALUES (:river,:slug,:title,:locality,:sort,:summary,:body,:geom,:source,'draft',:admin)");
        $stmt->execute(['river'=>$riverId,'slug'=>$slug,'title'=>$title,'locality'=>$locality,'sort'=>$sort,'summary'=>$summary,'body'=>$body,'geom'=>$geometry,'source'=>$sourceId,'admin'=>(int)$admin['id']]);
        $id = (int) $pdo->lastInsertId();
        $action = 'segment_create';
    }
    // Existing audit trail is linked to the parent river (no schema change).
    $audit = $pdo->prepare('INSERT INTO directory_entry_events (directory_entry_id, admin_user_id, action) VALUES (:river,:admin,:action)');
    $audit->execute(['river'=>$riverId,'admin'=>(int)$admin['id'],'action'=>$action]);
    $pdo->commit();
    header('Cache-Control: no-store');
    successResponse(['segment'=>['id'=>$id,'river_entry_id'=>$riverId,'slug'=>$slug,'title'=>$title,'status'=>'draft']]);
} catch (PDOException $error) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    if ((string) $error->getCode() === '23000') errorResponse('Slug участка уже занят в этой реке или нарушена связь с источником', 409);
    error_log('[directory/segments/save] ' . $error->getMessage());
    errorResponse('Не удалось сохранить участок', 500);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    error_log('[directory/segments/save] ' . $error->getMessage());
    errorResponse('Не удалось сохранить участок', 500);
}
