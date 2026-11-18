<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';
directoryRequireMethod('POST');
requireAdmin();
$input = sourcesInput();
directoryAssertCsrf($input);
$title = directoryString($input, 'title', 250);
if (mb_strlen($title, 'UTF-8') < 3) errorResponse('Название источника слишком короткое', 422);
$kind = directoryString($input, 'source_kind', 32);
if (!in_array($kind, ['official','osm','scientific','licensed_media','observation','other'], true)) errorResponse('Некорректный тип источника', 422);
$publisher = directoryString($input, 'publisher', 250);
$url = sourcesUrl($input, 'url', false);
$accessed = sourcesDate($input, 'accessed_at', true);
$published = sourcesDate($input, 'published_on', false);
$license = directoryString($input, 'license_name', 180);
$licenseUrl = sourcesUrl($input, 'license_url', false);
$comment = directoryString($input, 'comment', 2000);
try {
    $pdo = getDatabaseConnection();
    // Without an URL, two different printed books or observations must never collapse into one source.
    if ($url !== '') {
        $found = $pdo->prepare('SELECT id, title FROM directory_sources WHERE url = :url ORDER BY id ASC LIMIT 1');
        $found->execute(['url' => $url]);
        $existing = $found->fetch();
        if ($existing) {
            header('Cache-Control: no-store');
            successResponse(['source' => ['id'=>(int)$existing['id'],'title'=>$existing['title']], 'reused' => true]);
        }
    }
    $stmt = $pdo->prepare('INSERT INTO directory_sources (title, source_kind, publisher, url, accessed_at, published_on, license_name, license_url, comment) VALUES (:title,:kind,:publisher,:url,:accessed,:published,:license,:license_url,:comment)');
    $stmt->execute(['title'=>$title,'kind'=>$kind,'publisher'=>$publisher,'url'=>$url,'accessed'=>$accessed,'published'=>$published,'license'=>$license,'license_url'=>$licenseUrl,'comment'=>$comment]);
    header('Cache-Control: no-store');
    successResponse(['source' => ['id'=>(int)$pdo->lastInsertId(),'title'=>$title], 'reused' => false]);
} catch (Throwable $error) {
    error_log('[directory/sources/save] ' . $error->getMessage());
    errorResponse('Не удалось сохранить источник', 500);
}
