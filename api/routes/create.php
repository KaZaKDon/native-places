<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(
    file_get_contents('php://input'),
    true
);

$title = trim($input['title'] ?? '');
$description = trim($input['description'] ?? '');
$isPublic = !empty($input['is_public']) ? 1 : 0;

if ($title === '') {
    errorResponse('Введите название маршрута', 422);
}

try {

    $pdo = getDatabaseConnection();

    $shareToken = bin2hex(random_bytes(16));

    $stmt = $pdo->prepare("
        INSERT INTO routes (
            user_id,
            title,
            description,
            is_public,
            share_token,
            created_at,
            updated_at
        ) VALUES (
            :user_id,
            :title,
            :description,
            :is_public,
            :share_token,
            NOW(),
            NOW()
        )
    ");

    $stmt->execute([
        'user_id' => $userId,
        'title' => $title,
        'description' => $description !== '' ? $description : null,
        'is_public' => $isPublic,
        'share_token' => $shareToken,
    ]);

    $routeId = (int) $pdo->lastInsertId();

    successResponse([
        'message' => 'Маршрут успешно создан',
        'route' => [
            'id' => $routeId,
            'title' => $title,
            'description' => $description !== '' ? $description : null,
            'is_public' => (bool) $isPublic,
            'share_token' => $shareToken,
        ],
    ], 201);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось создать маршрут',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );
}
