<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdminOrModerator();

$status = trim((string) ($_GET['status'] ?? ''));
$query = trim((string) ($_GET['q'] ?? ''));

$allowedStatuses = [
    '',
    'pending',
    'published',
    'rejected',
];

if (!in_array($status, $allowedStatuses, true)) {
    errorResponse('Некорректный статус отзыва', 422);
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
            r.review_text,
            r.status,
            r.created_at,
            r.updated_at,
            r.moderated_at,

            p.title AS place_title,
            p.slug AS place_slug,
            p.status AS place_status,
            p.cover_image,

            u.email AS user_email,
            u.first_name AS user_first_name,
            u.last_name AS user_last_name,
            u.avatar AS user_avatar
        FROM reviews r
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
                r.review_text LIKE :query_review_text
                OR p.title LIKE :query_place_title
                OR u.email LIKE :query_user_email
                OR u.first_name LIKE :query_user_first_name
                OR u.last_name LIKE :query_user_last_name
            )
        ";

        $searchValue = '%' . $query . '%';

        $params['query_review_text'] = $searchValue;
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
        'reviews' => $stmt->fetchAll(),
        'filters' => [
            'status' => $status,
            'q' => $query,
        ],
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить отзывы', 500, [
        'error' => $e->getMessage(),
    ]);
}
