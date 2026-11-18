# api/admin/directory/media/upload.php

**Статус:** PHP-файл для установленного API v0.4b; изменение v0.4b.2 подготовлено, пока не установлено. Локально только текстовая копия.

```php
<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';
directoryRequireMethod('POST');
$admin = requireAdmin();
directoryAssertCsrf($_POST);
$speciesId = speciesId($_POST['species_id'] ?? null, 'species_id');
if ((string)($_POST['rights_confirmed'] ?? '') !== '1') errorResponse('Подтвердите право размещения изображения', 422);
// Backward compatible: older admin builds omit image_origin and are treated as ordinary photos.
$origin = trim((string)($_POST['image_origin'] ?? 'photo'));
if (!in_array($origin, ['photo', 'ai_generated'], true)) {
    errorResponse('Неизвестное происхождение изображения', 422);
}
$caption = directoryString($_POST, 'caption', 300);
$alt = directoryString($_POST, 'alt_text', 300);
$attribution = directoryString($_POST, 'attribution', 1000);
$licenseUrl = mediaHttpUrl((string)($_POST['license_url'] ?? ''), 'license_url');
$sourceUrl = mediaHttpUrl((string)($_POST['source_url'] ?? ''), 'source_url');
if ($origin === 'ai_generated') {
    // Never trust client-supplied author/license for AI provenance.
    $aiTool = trim((string)($_POST['ai_tool'] ?? ''));
    if ($aiTool === '' || mb_strlen($aiTool, 'UTF-8') > 190) {
        errorResponse('Укажите инструмент ИИ-генерации (до 190 символов)', 422);
    }
    $author = 'ИИ: ' . $aiTool;
    $license = 'ИИ-иллюстрация — отдельная лицензия на чужое фото не требуется';
    $attribution = 'Создано с помощью ' . $aiTool . ($attribution === '' ? '' : '. ' . $attribution);
} else {
    $author = directoryString($_POST, 'author', 250);
    $license = directoryString($_POST, 'license_name', 180);
    if ($author === '' || $license === '') {
        errorResponse('Укажите автора и лицензию или основание использования', 422);
    }
}
// Preserve the existing DB columns and avoid requiring a schema migration.
if (mb_strlen($author, 'UTF-8') > 250 || mb_strlen($attribution, 'UTF-8') > 1000) {
    errorResponse('Сведения о происхождении изображения слишком длинные', 422);
}
if (!extension_loaded('gd')) errorResponse('На сервере недоступна обработка изображений (GD). Не удалось безопасно удалить метаданные.', 503);
if (!isset($_FILES['image']) || !is_array($_FILES['image'])) errorResponse('Выберите фотографию', 422);
$file = $_FILES['image'];
if ($file['error'] !== UPLOAD_ERR_OK) errorResponse('Ошибка загрузки файла (проверьте ограничения хостинга)', 422);
if ((int)$file['size'] <= 0 || (int)$file['size'] > 3 * 1024 * 1024 || !is_uploaded_file((string)$file['tmp_name'])) {
    errorResponse('Файл должен быть изображением размером до 3 МБ', 422);
}
$tmp = (string)$file['tmp_name'];
$info = @getimagesize($tmp);
if (!$info || !in_array($info['mime'] ?? '', ['image/jpeg','image/png','image/webp'], true)) {
    errorResponse('Допустимы только JPEG, PNG и WebP', 422);
}
$width = (int)$info[0]; $height = (int)$info[1];
if ($width < 32 || $height < 32 || $width > 5000 || $height > 5000 || $width * $height > 12000000) {
    errorResponse('Размер изображения должен быть от 32×32 до 12 Мп', 422);
}
$raw = file_get_contents($tmp);
if ($raw === false) errorResponse('Файл не читается', 422);
$source = @imagecreatefromstring($raw);
unset($raw);
if (!$source) errorResponse('Не удалось декодировать изображение', 422);
$ratio = min(1, 1600 / max($width, $height));
$newW = (int)max(1, round($width * $ratio));
$newH = (int)max(1, round($height * $ratio));
$canvas = imagecreatetruecolor($newW, $newH);
// White background for transparent originals if JPEG fallback is necessary.
$white = imagecolorallocate($canvas, 255, 255, 255);
imagefill($canvas, 0, 0, $white);
if (!imagecopyresampled($canvas, $source, 0, 0, 0, 0, $newW, $newH, $width, $height)) {
    imagedestroy($source); imagedestroy($canvas);
    errorResponse('Не удалось обработать фотографию', 422);
}
imagedestroy($source);
ob_start();
$webp = function_exists('imagewebp');
$encoded = $webp ? @imagewebp($canvas, null, 82) : @imagejpeg($canvas, null, 85);
$imageData = ob_get_clean();
imagedestroy($canvas);
if (!$encoded || !is_string($imageData) || strlen($imageData) === 0 || strlen($imageData) > 2 * 1024 * 1024) {
    errorResponse('Не удалось получить безопасное изображение до 2 МБ', 422);
}
$mime = $webp ? 'image/webp' : 'image/jpeg';
try {
    $pdo = getDatabaseConnection();
    $pdo->beginTransaction();
    $check = $pdo->prepare('SELECT id,status FROM directory_species WHERE id=:id FOR UPDATE');
    $check->execute(['id'=>$speciesId]);
    $species = $check->fetch();
    if (!$species || $species['status'] !== 'draft') { $pdo->rollBack(); errorResponse('Фотографии можно добавлять только к существующему черновику вида', 409); }
    $count = $pdo->prepare('SELECT COUNT(*) FROM directory_media_links WHERE species_id=:id');
    $count->execute(['id'=>$speciesId]);
    $n = (int)$count->fetchColumn();
    if ($n >= 8) { $pdo->rollBack(); errorResponse('Не более 8 фотографий на вид', 422); }
    $stmt = $pdo->prepare("INSERT INTO directory_media (storage_path,image_data,mime,width,height,size_bytes,sha256,caption,alt_text,author,license_name,license_url,source_url,attribution,status,created_by_admin_id) VALUES ('db:private',:blob,:mime,:w,:h,:bytes,:sha,:caption,:alt,:author,:license,:license_url,:source_url,:attribution,'draft',:admin)");
    $stmt->bindValue(':blob', $imageData, PDO::PARAM_LOB);
    $stmt->bindValue(':mime', $mime);
    $stmt->bindValue(':w', $newW, PDO::PARAM_INT);
    $stmt->bindValue(':h', $newH, PDO::PARAM_INT);
    $stmt->bindValue(':bytes', strlen($imageData), PDO::PARAM_INT);
    $stmt->bindValue(':sha', hash('sha256', $imageData));
    $stmt->bindValue(':caption', $caption);
    $stmt->bindValue(':alt', $alt);
    $stmt->bindValue(':author', $author);
    $stmt->bindValue(':license', $license);
    $stmt->bindValue(':license_url', $licenseUrl);
    $stmt->bindValue(':source_url', $sourceUrl);
    $stmt->bindValue(':attribution', $attribution);
    $stmt->bindValue(':admin', (int)$admin['id'], PDO::PARAM_INT);
    $stmt->execute();
    $id = (int)$pdo->lastInsertId();
    $link = $pdo->prepare('INSERT INTO directory_media_links (media_id,species_id,sort_order,is_cover) VALUES (:media,:species,:order,:cover)');
    $link->execute(['media'=>$id,'species'=>$speciesId,'order'=>$n * 10,'cover'=>$n === 0 ? 1 : 0]);
    $pdo->commit();
    header('Cache-Control: no-store');
    successResponse(['media'=>['id'=>$id,'mime'=>$mime,'width'=>$newW,'height'=>$newH,'status'=>'draft']]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    error_log('[directory/media/upload] ' . $e->getMessage());
    errorResponse('Не удалось сохранить фотографию', 500);
}
```
