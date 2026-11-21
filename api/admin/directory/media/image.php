<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';
directoryRequireMethod('GET');
requireAdmin();
$id = speciesId($_GET['id'] ?? null, 'id');
try {
    $pdo = getDatabaseConnection();
    $stmt = $pdo->prepare('SELECT mime,image_data FROM directory_media WHERE id=:id LIMIT 1');
    $stmt->execute(['id'=>$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row || !in_array($row['mime'], ['image/webp','image/jpeg','image/png'], true)) errorResponse('Фотография не найдена', 404);
    header('Content-Type: ' . $row['mime']);
    header('Cache-Control: private, no-store');
    header('X-Content-Type-Options: nosniff');
    header('Content-Security-Policy: default-src \'none\'; sandbox');
    echo $row['image_data'];
    exit;
} catch (Throwable $e) {
    error_log('[directory/media/image] ' . $e->getMessage());
    errorResponse('Не удалось открыть фотографию', 500);
}
