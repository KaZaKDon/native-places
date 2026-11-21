<?php
declare(strict_types=1);
require_once __DIR__ . '/_bootstrap.php';
directoryPublicGetOnly();
$page = filter_var($_GET['page'] ?? 1, FILTER_VALIDATE_INT, ['options'=>['min_range'=>1,'max_range'=>1000]]);
if (!$page) errorResponse('Некорректная страница', 422);
$limit = 24;
$offset = ((int)$page-1)*$limit;
try {
    $pdo = getDatabaseConnection();
    $sql = "SELECT s.id,s.slug,s.kind,s.common_name,s.scientific_name,s.summary,s.updated_at, " . publicSpeciesCoverSql() . " AS cover_image_id
        FROM directory_species s WHERE s.status='published' AND s.kind IN ('fish','bird','mammal') AND " . publicSpeciesVisibleSql() .
        ' ORDER BY s.common_name ASC,s.id ASC LIMIT ' . ($limit+1) . ' OFFSET ' . $offset;
    $rows = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
    $more = count($rows)>$limit;
    successResponse(['species'=>array_slice($rows,0,$limit),'page'=>(int)$page,'has_more'=>$more]);
} catch (Throwable $e) {
    error_log('[directory/species/index] '.$e->getMessage());
    errorResponse('Сведения о видах временно недоступны', 503);
}
