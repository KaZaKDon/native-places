<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdminOrModerator();

$status = trim((string) ($_GET['status'] ?? ''));
$query = trim((string) ($_GET['q'] ?? ''));

$allowedStatuses = [
    '',
    'new',
    'in_work',
    'closed',
];

if (!in_array($status, $allowedStatuses, true)) {
    errorResponse('Некорректный статус обращения', 422);
}

if (mb_strlen($query, 'UTF-8') > 100) {
    errorResponse('Поисковый запрос слишком длинный', 422);
}

try {
    $pdo = getDatabaseConnection();

    $sql = "
        SELECT
            a.id,
            a.user_id,
            a.appeal_type,
            a.contact,
            a.message,
            a.admin_response,
            a.status,
            a.created_at,
            a.updated_at,
            a.closed_at,

            u.email AS user_email,
            u.first_name AS user_first_name,
            u.last_name AS user_last_name,
            u.avatar AS user_avatar
        FROM appeals a
        INNER JOIN users u
            ON u.id = a.user_id
        WHERE 1 = 1
    ";

    $params = [];

    if ($status !== '') {
        $sql .= " AND a.status = :status";
        $params['status'] = $status;
    }

    if ($query !== '') {
        $sql .= "
            AND (
                a.message LIKE :query_message
                OR a.contact LIKE :query_contact
                OR a.admin_response LIKE :query_admin_response
                OR a.appeal_type LIKE :query_appeal_type
                OR u.email LIKE :query_user_email
                OR u.first_name LIKE :query_user_first_name
                OR u.last_name LIKE :query_user_last_name
            )
        ";

        $searchValue = '%' . $query . '%';

        $params['query_message'] = $searchValue;
        $params['query_contact'] = $searchValue;
        $params['query_admin_response'] = $searchValue;
        $params['query_appeal_type'] = $searchValue;
        $params['query_user_email'] = $searchValue;
        $params['query_user_first_name'] = $searchValue;
        $params['query_user_last_name'] = $searchValue;
    }

    $sql .= "
        ORDER BY a.created_at DESC, a.id DESC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    successResponse([
        'appeals' => $stmt->fetchAll(),
        'filters' => [
            'status' => $status,
            'q' => $query,
        ],
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить обращения', 500, [
        'error' => $e->getMessage(),
    ]);
}
