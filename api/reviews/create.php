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
$reviewText = trim($input['review_text'] ?? '');

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

if ($reviewText === '') {
    errorResponse('Введите текст отзыва', 422);
}

if (mb_strlen($reviewText) < 10) {
    errorResponse('Отзыв слишком короткий', 422);
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

    $existsStmt = $pdo->prepare("
        SELECT id
        FROM reviews
        WHERE place_id = :place_id
        AND user_id = :user_id
        LIMIT 1
    ");

    $existsStmt->execute([
        'place_id' => $placeId,
        'user_id' => $userId,
    ]);

    if ($existsStmt->fetch()) {
        errorResponse(
            'Вы уже оставляли отзыв для этого объекта',
            422
        );
    }

    $stmt = $pdo->prepare("
        INSERT INTO reviews (
            place_id,
            user_id,
            review_text,
            status,
            created_at,
            updated_at
        ) VALUES (
            :place_id,
            :user_id,
            :review_text,
            'pending',
            NOW(),
            NOW()
        )
    ");

    $stmt->execute([
        'place_id' => $placeId,
        'user_id' => $userId,
        'review_text' => $reviewText,
    ]);

    successResponse([
        'message' => 'Отзыв отправлен на модерацию',
        'review_id' => (int) $pdo->lastInsertId(),
    ], 201);

} catch (Throwable $e) {

    errorResponse(
        'Не удалось создать отзыв',
        500,
        [
            'error' => $e->getMessage(),
        ]
    );
}
