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
            title,
            status
        FROM places
        WHERE id = :id
        AND user_id = :user_id
        LIMIT 1
    ");

    $placeStmt->execute([
        'id' => $placeId,
        'user_id' => $userId,
    ]);

    $place = $placeStmt->fetch();

    if (!$place) {
        errorResponse('Объявление не найдено или нет доступа', 404);
    }

    if ($place['status'] !== 'expired') {
        errorResponse('Восстановить можно только объявление из архива', 422);
    }

    $subscriptionStmt = $pdo->prepare("
        SELECT
            us.id,
            p.max_places
        FROM user_subscriptions us
        INNER JOIN plans p
            ON p.id = us.plan_id
        WHERE us.user_id = :user_id
        AND us.status = 'active'
        ORDER BY us.starts_at DESC, us.id DESC
        LIMIT 1
    ");

    $subscriptionStmt->execute([
        'user_id' => $userId,
    ]);

    $subscription = $subscriptionStmt->fetch();

    if (!$subscription) {
        errorResponse('Нет активного тарифа для восстановления объявления', 422);
    }

    $maxPlaces = (int) ($subscription['max_places'] ?? 0);

    if ($maxPlaces > 0) {
        $activePlacesStmt = $pdo->prepare("
            SELECT COUNT(*)
            FROM places
            WHERE user_id = :user_id
            AND status IN ('pending', 'published', 'rejected')
        ");

        $activePlacesStmt->execute([
            'user_id' => $userId,
        ]);

        $activePlacesCount = (int) $activePlacesStmt->fetchColumn();

        if ($activePlacesCount >= $maxPlaces) {
            errorResponse('Превышен лимит объявлений по текущему тарифу', 422, [
                'errors' => [
                    'place_id' => 'Выберите тариф с большим лимитом или оставьте объявление в архиве',
                ],
                'limit' => $maxPlaces,
                'used' => $activePlacesCount,
            ]);
        }
    }

    $updateStmt = $pdo->prepare("
        UPDATE places
        SET
            status = 'pending',
            moderated_at = NULL,
            updated_at = NOW()
        WHERE id = :id
        AND user_id = :user_id
        AND status = 'expired'
        LIMIT 1
    ");

    $updateStmt->execute([
        'id' => $placeId,
        'user_id' => $userId,
    ]);

    successResponse([
        'message' => 'Объявление восстановлено и отправлено на модерацию',
        'place_id' => $placeId,
        'title' => $place['title'],
        'status' => 'pending',
    ]);
} catch (Throwable $e) {
    errorResponse('Не удалось восстановить объявление', 500, [
        'error' => $e->getMessage(),
    ]);
}
