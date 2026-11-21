<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../config/database.php';

try {
    $pdo = getDatabaseConnection();

    $categoriesStmt = $pdo->query("
        SELECT
            id,
            code,
            title,
            description,
            icon,
            color,
            sort_order
        FROM categories
        WHERE is_active = 1
        ORDER BY sort_order ASC, id ASC
    ");

    $typesStmt = $pdo->query("
        SELECT
            pt.id,
            pt.category_id,
            pt.code,
            pt.title,
            pt.sort_order,
            c.code AS category_code,
            c.title AS category_title
        FROM place_types pt
        INNER JOIN categories c ON c.id = pt.category_id
        WHERE pt.is_active = 1
        AND c.is_active = 1
        ORDER BY c.sort_order ASC, pt.sort_order ASC, pt.title ASC
    ");

    successResponse([
        'categories' => $categoriesStmt->fetchAll(),
        'types' => $typesStmt->fetchAll(),
        'publication_types' => [
            [
                'value' => 'free',
                'title' => 'Бесплатное размещение',
            ],
            [
                'value' => 'paid',
                'title' => 'Платное размещение',
            ],
        ],
        'booking_types' => [
            [
                'value' => 'chat',
                'title' => 'Чат',
            ],
            [
                'value' => 'phone',
                'title' => 'Телефон',
            ],
            [
                'value' => 'external',
                'title' => 'Внешняя ссылка',
            ],
        ],
        'commercial_options' => [
            [
                'value' => 0,
                'title' => 'Частный объект',
            ],
            [
                'value' => 1,
                'title' => 'Коммерческий объект',
            ],
        ],
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось получить фильтры объектов', 500, [
        'error' => $e->getMessage(),
    ]);
}
