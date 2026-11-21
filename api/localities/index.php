<?php

declare(strict_types=1);

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/request.php';
require_once __DIR__ . '/../config/database.php';

requireHttpMethod('GET');

$search = trim((string) ($_GET['q'] ?? ''));
$region = trim((string) ($_GET['region'] ?? ''));
$limit = filter_var($_GET['limit'] ?? 50, FILTER_VALIDATE_INT, [
    'options' => ['min_range' => 1, 'max_range' => 200],
]);

if ($limit === false || mb_strlen($search, 'UTF-8') > 150 || mb_strlen($region, 'UTF-8') > 150) {
    errorResponse('Некорректные параметры поиска населённых пунктов', 422);
}

try {
    $pdo = getDatabaseConnection();
    $sql = 'SELECT l.id, l.region, l.district, l.title, l.slug,
                   l.latitude, l.longitude, l.region_id, l.district_id,
                   r.title AS region_title, d.title AS district_title
            FROM localities AS l
            LEFT JOIN regions AS r ON r.id = l.region_id
            LEFT JOIN districts AS d ON d.id = l.district_id
            WHERE l.is_active = 1';
    $params = [];
    if ($search !== '') {
        $sql .= ' AND (l.title LIKE :q_title OR l.district LIKE :q_district
                   OR l.region LIKE :q_region OR d.title LIKE :q_district_title
                   OR r.title LIKE :q_region_title)';
        $params['q_title'] = '%' . $search . '%';
        $params['q_district'] = '%' . $search . '%';
        $params['q_region'] = '%' . $search . '%';
        $params['q_district_title'] = '%' . $search . '%';
        $params['q_region_title'] = '%' . $search . '%';
    }
    if ($region !== '') {
        $sql .= ' AND (l.region = :region_text OR r.title = :region_title)';
        $params['region_text'] = $region;
        $params['region_title'] = $region;
    }
    $sql .= ' ORDER BY l.sort_order ASC, l.title ASC, l.id ASC LIMIT ' . (int) $limit;
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    successResponse(['localities' => $stmt->fetchAll(PDO::FETCH_ASSOC), 'filters' => [
        'q' => $search,
        'region' => $region,
    ]]);
} catch (Throwable $error) {
    error_log('[api/localities/index] ' . $error->getMessage());
    errorResponse('Не удалось получить населённые пункты', 500);
}
