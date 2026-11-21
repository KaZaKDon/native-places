<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    errorResponse('Некорректный JSON', 400);
}

$placeId = (int) ($input['place_id'] ?? 0);

if ($placeId <= 0) {
    errorResponse('Не передан ID объекта', 400);
}

try {
    $pdo = getDatabaseConnection();

    $placeStmt = $pdo->prepare("
        SELECT
            id,
            user_id,
            title,
            slug,
            status,
            expires_at,
            payment_status
        FROM places
        WHERE id = :place_id
        LIMIT 1
    ");

    $placeStmt->execute([
        'place_id' => $placeId,
    ]);

    $place = $placeStmt->fetch();

    if (!$place) {
        errorResponse('Объект не найден', 404);
    }

    if ((int) $place['user_id'] === $userId) {
        errorResponse('Нельзя открыть диалог со своим объявлением', 422);
    }

    if ($place['status'] !== 'published') {
        errorResponse('По этому объявлению нельзя написать сообщение', 422);
    }

    if ($place['expires_at'] !== null && strtotime($place['expires_at']) < time()) {
        errorResponse('Срок публикации объявления истёк', 422);
    }

    if ($place['payment_status'] !== null && !in_array($place['payment_status'], ['not_required', 'paid'], true)) {
        errorResponse('Объявление ожидает оплату', 422);
    }

    $conversationStmt = $pdo->prepare("
        SELECT id
        FROM conversations
        WHERE place_id = :place_id
        AND owner_id = :owner_id
        AND user_id = :user_id
        LIMIT 1
    ");

    $conversationStmt->execute([
        'place_id' => $placeId,
        'owner_id' => (int) $place['user_id'],
        'user_id' => $userId,
    ]);

    $conversation = $conversationStmt->fetch();

    if ($conversation) {
        successResponse([
            'message' => 'Диалог уже существует',
            'conversation_id' => (int) $conversation['id'],
            'created' => false,
            'place' => $place,
        ]);
    }

    $insertStmt = $pdo->prepare("
        INSERT INTO conversations (
            place_id,
            owner_id,
            user_id,
            last_message_at,
            created_at,
            updated_at
        ) VALUES (
            :place_id,
            :owner_id,
            :user_id,
            NOW(),
            NOW(),
            NOW()
        )
    ");

    $insertStmt->execute([
        'place_id' => $placeId,
        'owner_id' => (int) $place['user_id'],
        'user_id' => $userId,
    ]);

    successResponse([
        'message' => 'Диалог создан',
        'conversation_id' => (int) $pdo->lastInsertId(),
        'created' => true,
        'place' => $place,
    ], 201);
} catch (Throwable $e) {
    errorResponse('Не удалось создать диалог', 500, [
        'error' => $e->getMessage(),
    ]);
}
