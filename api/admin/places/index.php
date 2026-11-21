<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdminOrModerator();

$status = trim((string) ($_GET['status'] ?? ''));
$category = trim((string) ($_GET['category'] ?? ''));
$query = trim((string) ($_GET['q'] ?? ''));

$allowedStatuses = [
    '',
    'pending',
    'published',
    'rejected',
    'expired',
];

if (!in_array($status, $allowedStatuses, true)) {
    errorResponse('Некорректный статус объявления', 422);
}

if ($category !== '' && !preg_match('/^[a-z0-9_-]+$/', $category)) {
    errorResponse('Некорректная категория', 422);
}

if (mb_strlen($query, 'UTF-8') > 100) {
    errorResponse('Поисковый запрос слишком длинный', 422);
}

try {
    $pdo = getDatabaseConnection();

    $sql = "
        SELECT
            p.id,
            p.user_id,
            p.category_id,
            p.place_type_id,
            p.title,
            p.slug,
            p.short_description,
            p.cover_image,
            p.address,
            p.status,
            p.publication_type,
            p.payment_status,
            p.created_at,
            p.updated_at,

            u.email AS owner_email,
            u.first_name AS owner_first_name,
            u.last_name AS owner_last_name,

            c.code AS category_code,
            c.title AS category_title,

            pt.code AS type_code,
            pt.title AS type_title
        FROM places p
        INNER JOIN users u
            ON u.id = p.user_id
        INNER JOIN categories c
            ON c.id = p.category_id
        INNER JOIN place_types pt
            ON pt.id = p.place_type_id
        WHERE 1 = 1
    ";

    $params = [];

    if ($status !== '') {
        $sql .= " AND p.status = :status";
        $params['status'] = $status;
    }

    if ($category !== '') {
        $sql .= " AND c.code = :category";
        $params['category'] = $category;
    }

    if ($query !== '') {
        $sql .= "
            AND (
                p.title LIKE :query_title
                OR p.short_description LIKE :query_short_description
                OR p.address LIKE :query_address
                OR u.email LIKE :query_owner_email
                OR u.first_name LIKE :query_owner_first_name
                OR u.last_name LIKE :query_owner_last_name
            )
        ";

        $searchValue = '%' . $query . '%';

        $params['query_title'] = $searchValue;
        $params['query_short_description'] = $searchValue;
        $params['query_address'] = $searchValue;
        $params['query_owner_email'] = $searchValue;
        $params['query_owner_first_name'] = $searchValue;
        $params['query_owner_last_name'] = $searchValue;
    }

    $sql .= "
        ORDER BY p.created_at DESC, p.id DESC
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    successResponse([
        'places' => $stmt->fetchAll(),
        'filters' => [
            'status' => $status,
            'category' => $category,
            'q' => $query,
        ],
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить объявления', 500, [
        'error' => $e->getMessage(),
    ]);
}
