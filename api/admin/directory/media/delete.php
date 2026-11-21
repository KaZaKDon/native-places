<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';
directoryRequireMethod('POST');
requireAdmin();
$payload = speciesInput();
directoryAssertCsrf($payload);
$id = speciesId($payload['id'] ?? null, 'id');
$speciesId = speciesId($payload['species_id'] ?? null, 'species_id');
try {
    $pdo = getDatabaseConnection();
    $pdo->beginTransaction();
    $q = $pdo->prepare('SELECT m.status, l.species_id FROM directory_media m JOIN directory_media_links l ON l.media_id=m.id WHERE m.id=:id FOR UPDATE');
    $q->execute(['id'=>$id]);
    $row = $q->fetch();
    if (!$row || (int)$row['species_id'] !== $speciesId || $row['status'] !== 'draft') {
        $pdo->rollBack(); errorResponse('Черновик фотографии не найден', 404);
    }
    $link = $pdo->prepare('DELETE FROM directory_media_links WHERE media_id=:id AND species_id=:species');
    $link->execute(['id'=>$id,'species'=>$speciesId]);
    $file = $pdo->prepare("DELETE FROM directory_media WHERE id=:id AND status='draft'");
    $file->execute(['id'=>$id]);
    if ($file->rowCount() !== 1) throw new RuntimeException('Фотография не удалена');
    $pdo->commit();
    header('Cache-Control: no-store');
    successResponse(['deleted'=>true]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    error_log('[directory/media/delete] ' . $e->getMessage());
    errorResponse('Не удалось удалить фотографию', 500);
}
