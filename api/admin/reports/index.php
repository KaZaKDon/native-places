<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdminOrModerator();

$status = trim((string) ($_GET['status'] ?? ''));
$query = trim((string) ($_GET['q'] ?? ''));

$allowedStatuses = [
    '',
    'new',
    'in_progress',
    'resolved',
    'rejected',
];

if (!in_array($status, $allowedStatuses, true)) {
    errorResponse('Некорректный статус жалобы', 422);
}

if (mb_strlen($query, 'UTF-8') > 100) {
    errorResponse('Поисковый запрос слишком длинный', 422);
}

try {
    $pdo = getDatabaseConnection();

    $sql = "
        SELECT
            r.id,
            r.place_id,
            r.user_id,
            r.report_type,
            r.message,
            r.status,
            r.created_at,
            r.updated_at,
            r.resolved_at,

            p.title AS place_title,
            p.slug AS place_slug,
            p.status AS place_status,
            p.cover_image,

            u.email AS user_email,
            u.first_name AS user_first_name,
            u.last_name AS user_last_name
        FROM reports r
        INNER JOIN places p
            ON p.id = r.place_id
        INNER JOIN users u
            ON u.id = r.user_id
        WHERE 1 = 1
    ";

    $params = [];

    if ($status !== '') {
        $sql .= " AND r.status = :status";
        $params['status'] = $status;
    }

    if ($query !== '') {
        $sql .= "
            AND (
                r.message LIKE :query_message
                OR r.report_type LIKE :query_report_type
                OR p.title LIKE :query_place_title
                OR u.email LIKE :query_user_email
                OR u.first_name LIKE :query_user_first_name
                OR u.last_name LIKE :query_user_last_name
            )
        ";

        $searchValue = '%' . $query . '%';

        $params['query_message'] = $searchValue;
        $params['query_report_type'] = $searchValue;
        $params['query_place_title'] = $searchValue;
        $params['query_user_email'] = $searchValue;
        $params['query_user_first_name'] = $searchValue;
        $params['query_user_last_name'] = $searchValue;
    }

    $sql .= "
        ORDER BY r.created_at DESC, r.id DESC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    successResponse([
        'reports' => $stmt->fetchAll(),
        'filters' => [
            'status' => $status,
            'q' => $query,
        ],
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить жалобы', 500, [
        'error' => $e->getMessage(),
    ]);
}
