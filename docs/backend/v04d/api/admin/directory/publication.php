<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/_territory.php';
directoryRequireMethod('POST');
$admin = requireAdmin();
$payload = json_decode(file_get_contents('php://input'), true);
if (!is_array($payload)) errorResponse('Ожидается JSON-объект', 422);
directoryAssertCsrf($payload);
$id = filter_var($payload['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
$action = $payload['action'] ?? '';
if (!$id || !in_array($action, ['publish', 'unpublish'], true)) {
    errorResponse('Укажите объект и действие публикации', 422);
}
try {
    $pdo = getDatabaseConnection();
    $pdo->beginTransaction();
    $stmt = $pdo->prepare('SELECT id, slug, title, type, summary, body, source_url, geometry_geojson, status FROM directory_entries WHERE id = :id FOR UPDATE');
    $stmt->execute(['id' => $id]);
    $entry = $stmt->fetch();
    if (!$entry) {
        $pdo->rollBack();
        errorResponse('Справочный объект не найден', 404);
    }
    if ($action === 'publish') {
        if ($entry['status'] !== 'draft') {
            $pdo->rollBack();
            errorResponse('Опубликовать можно только черновик', 409);
        }
        $summary = trim((string) $entry['summary']);
        $body = trim((string) $entry['body']);
        $source = trim((string) $entry['source_url']);
        // Prevent publishing placeholder/duplicated content as an SEO landing page.
        if (mb_strlen($summary, 'UTF-8') < 40 || mb_strlen($body, 'UTF-8') < 120 ||
            mb_strtolower($summary, 'UTF-8') === mb_strtolower($body, 'UTF-8') || $source === '') {
            $pdo->rollBack();
            errorResponse('Перед публикацией заполните описание (от 40 символов), отдельный подробный текст (от 120 символов) и источник сведений', 422);
        }
        directoryTerritoryAssertPublish($pdo, $entry);
        $update = $pdo->prepare("UPDATE directory_entries SET status='published', published_at=NOW() WHERE id=:id AND status='draft'");
        $auditAction = 'publish';
        $status = 'published';
    } else {
        if ($entry['status'] !== 'published') {
            $pdo->rollBack();
            errorResponse('Снять с публикации можно только опубликованный объект', 409);
        }
        $update = $pdo->prepare("UPDATE directory_entries SET status='draft', published_at=NULL WHERE id=:id AND status='published'");
        $auditAction = 'unpublish';
        $status = 'draft';
    }
    $update->execute(['id' => $id]);
    if ($update->rowCount() !== 1) throw new RuntimeException('Не удалось изменить статус объекта');
    $audit = $pdo->prepare('INSERT INTO directory_entry_events (directory_entry_id, admin_user_id, action) VALUES (:entry, :admin, :action)');
    $audit->execute(['entry' => $id, 'admin' => (int) $admin['id'], 'action' => $auditAction]);
    $pdo->commit();
    header('Cache-Control: no-store');
    successResponse(['entry' => ['id' => (int) $id, 'slug' => $entry['slug'], 'type' => $entry['type'], 'title' => $entry['title'], 'status' => $status]]);
} catch (Throwable $error) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    error_log('[directory/publication] ' . $error->getMessage());
    errorResponse('Не удалось изменить публикацию', 500);
}
