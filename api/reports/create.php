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

$placeId = (int) ($input['place_id'] ?? 0);
$reportType = trim($input['report_type'] ?? '');
$message = trim($input['message'] ?? '');

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

if ($reportType === '') {
    errorResponse('Выберите тип жалобы', 422);
}

if ($message === '') {
    errorResponse('Опишите причину жалобы', 422);
}

try {

    $pdo = getDatabaseConnection();

    $placeStmt = $pdo->prepare("
        SELECT id
        FROM places
        WHERE id = :place_id
        AND status = 'published'
        LIMIT 1
    ");

    $placeStmt->execute([
        'place_id' => $placeId,
    ]);

    if (!$placeStmt->fetch()) {
        errorResponse('Объект не найден', 404);
    }

    $stmt = $pdo->prepare("
        INSERT INTO reports (
            place_id,
            user_id,
            report_type,
            message,
            status,
            created_at,
            updated_at
        ) VALUES (
            :place_id,
            :user_id,
            :report_type,
            :message,
            'new',
            NOW(),
            NOW()
        )
    ");

    $stmt->execute([
        'place_id' => $placeId,
        'user_id' => $userId,
        'report_type' => $reportType,
        'message' => $message,
    ]);

    successResponse([
        'message' => 'Жалоба отправлена',
        'report_id' => (int) $pdo->lastInsertId(),
    ], 201);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось отправить жалобу',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );
}
