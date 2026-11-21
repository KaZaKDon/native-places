<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

try {

    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        SELECT
            u.id,
            u.email,
            u.first_name,
            u.profile_status,
            u.phone,
            u.telegram,
            u.avatar,
            u.status,
            u.created_at,

            r.code AS role_code,
            r.title AS role_title

        FROM users u
        INNER JOIN roles r
            ON r.id = u.role_id

        WHERE u.id = :id
        LIMIT 1
    ");

    $stmt->execute([
        'id' => $userId,
    ]);

    $user = $stmt->fetch();

    if (!$user) {
        errorResponse('Пользователь не найден', 404);
    }

    successResponse([
        'user' => $user,
    ]);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось получить профиль',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );

}
