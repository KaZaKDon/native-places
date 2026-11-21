<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';
directoryRequireMethod('POST');
$admin = requireAdmin();
$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) errorResponse('Требуется JSON-объект', 422);
directoryAssertCsrf($input);

$type = directoryString($input, 'type', 32);
$allowedTypes = ['river', 'lake', 'forest', 'natural_area', 'hunting_ground', 'landmark', 'spring'];
if (!in_array($type, $allowedTypes, true)) errorResponse('Некорректный тип объекта', 422);
$slug = directoryString($input, 'slug', 160);
if (!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/D', $slug)) errorResponse('Неверный slug', 422);
$title = directoryString($input, 'title', 180);
if (mb_strlen($title, 'UTF-8') < 3) errorResponse('Название слишком короткое', 422);
$region = directoryString($input, 'region', 160);
$summary = directoryString($input, 'summary', 500);
$body = directoryString($input, 'body', 10000);
$sourceUrl = directoryString($input, 'source_url', 700);
if ($sourceUrl && (!filter_var($sourceUrl, FILTER_VALIDATE_URL) || !in_array(strtolower(parse_url($sourceUrl, PHP_URL_SCHEME) ?? ''), ['https', 'http'], true))) {
    errorResponse('Некорректная ссылка на источник', 422);
}
$geometry = directoryGeometry($input, $type);
$id = filter_var($input['id'] ?? 0, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) ?: 0;

try {
    $pdo = getDatabaseConnection();
    $pdo->beginTransaction();
    if ($id > 0) {
        $lock = $pdo->prepare('SELECT status FROM directory_entries WHERE id = :id FOR UPDATE');
        $lock->execute(['id' => $id]);
        $row = $lock->fetch();
        if (!$row) { $pdo->rollBack(); errorResponse('Черновик не найден', 404); }
        if ($row['status'] !== 'draft') { $pdo->rollBack(); errorResponse('Редактирование опубликованных объектов пока недоступно', 409); }
        $stmt = $pdo->prepare('UPDATE directory_entries SET slug=:slug, type=:type, title=:title, region=:region, summary=:summary, body=:body, source_url=:source, geometry_geojson=:geom WHERE id=:id');
        $stmt->execute(['slug'=>$slug,'type'=>$type,'title'=>$title,'region'=>$region,'summary'=>$summary,'body'=>$body,'source'=>$sourceUrl,'geom'=>$geometry,'id'=>$id]);
        $action = 'update_draft';
    } else {
        $stmt = $pdo->prepare("INSERT INTO directory_entries (slug, type, title, region, summary, body, source_url, geometry_geojson, status, created_by_admin_id) VALUES (:slug,:type,:title,:region,:summary,:body,:source,:geom,'draft',:user)");
        $stmt->execute(['slug'=>$slug,'type'=>$type,'title'=>$title,'region'=>$region,'summary'=>$summary,'body'=>$body,'source'=>$sourceUrl,'geom'=>$geometry,'user'=>(int)$admin['id']]);
        $id = (int) $pdo->lastInsertId();
        $action = 'create_draft';
    }
    $audit = $pdo->prepare('INSERT INTO directory_entry_events (directory_entry_id, admin_user_id, action) VALUES (:entry,:user,:action)');
    $audit->execute(['entry'=>$id,'user'=>(int)$admin['id'],'action'=>$action]);
    $pdo->commit();
    successResponse(['entry' => ['id'=>$id,'slug'=>$slug,'title'=>$title,'status'=>'draft']]);
} catch (PDOException $error) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    if ((string) $error->getCode() === '23000') errorResponse('Такой адрес (slug) уже используется', 409);
    error_log('Directory save PDO: ' . $error->getMessage());
    errorResponse('Не удалось сохранить черновик', 500);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    error_log('Directory save: ' . $error->getMessage());
    errorResponse('Не удалось сохранить черновик', 500);
}
