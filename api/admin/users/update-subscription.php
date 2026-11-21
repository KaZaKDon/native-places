<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';
require_once __DIR__ . '/../shared/moderator-log.php';

$adminUser = requireAdmin();

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    $input = [];
}

$userId = (int) ($input['user_id'] ?? 0);
$planId = (int) ($input['plan_id'] ?? 0);
$action = trim($input['action'] ?? 'assign');

$allowedActions = ['assign', 'extend', 'forever', 'disable'];

if ($userId <= 0) {
    errorResponse('Не передан ID пользователя', 422);
}

if (!in_array($action, $allowedActions, true)) {
    errorResponse('Некорректное действие с подпиской', 422);
}

if ($action !== 'disable' && $planId <= 0) {
    errorResponse('Выберите тариф', 422);
}

try {
    $pdo = getDatabaseConnection();

    $pdo->beginTransaction();

    $userStmt = $pdo->prepare("
        SELECT
            id,
            email,
            first_name,
            last_name,
            status
        FROM users
        WHERE id = :id
        LIMIT 1
    ");

    $userStmt->execute([
        'id' => $userId,
    ]);

    $user = $userStmt->fetch();

    if (!$user) {
        $pdo->rollBack();
        errorResponse('Пользователь не найден', 404);
    }

    if (($user['status'] ?? '') !== 'active') {
        $pdo->rollBack();
        errorResponse('Нельзя управлять подпиской заблокированного или удалённого пользователя', 403);
    }

    $currentSubscriptionStmt = $pdo->prepare("
        SELECT
            id,
            user_id,
            plan_id,
            source,
            status,
            starts_at,
            expires_at,
            created_at,
            updated_at
        FROM user_subscriptions
        WHERE user_id = :user_id
        AND status = 'active'
        ORDER BY id DESC
        LIMIT 1
    ");

    $currentSubscriptionStmt->execute([
        'user_id' => $userId,
    ]);

    $currentSubscription = $currentSubscriptionStmt->fetch();

    if ($action === 'disable') {
        if (!$currentSubscription) {
            $pdo->rollBack();
            errorResponse('У пользователя нет активной подписки', 422);
        }

        $disableStmt = $pdo->prepare("
            UPDATE user_subscriptions
            SET
                starts_at = starts_at,
                status = 'cancelled',
                updated_at = NOW()
            WHERE user_id = :user_id
            AND status = 'active'
        ");

        $disableStmt->execute([
            'user_id' => $userId,
        ]);

        writeModeratorLog(
            (int) $adminUser['id'],
            'disable_subscription',
            'user',
            $userId,
            'Отключена подписка пользователя: ' . ($user['email'] ?? ('#' . $userId))
        );

        $pdo->commit();

        successResponse([
            'message' => 'Подписка отключена',
            'user_id' => $userId,
        ]);
    }

    $planStmt = $pdo->prepare("
        SELECT
            id,
            code,
            title,
            description,
            max_places,
            duration_days,
            price,
            is_active
        FROM plans
        WHERE id = :id
        LIMIT 1
    ");

    $planStmt->execute([
        'id' => $planId,
    ]);

    $plan = $planStmt->fetch();

    if (!$plan) {
        $pdo->rollBack();
        errorResponse('Тариф не найден', 404);
    }

    if ((int) $plan['is_active'] !== 1) {
        $pdo->rollBack();
        errorResponse('Нельзя назначить отключённый тариф', 422);
    }

    $durationDays = (int) ($plan['duration_days'] ?? 0);

    if ($action !== 'forever' && $durationDays <= 0) {
        $pdo->rollBack();
        errorResponse('У тарифа некорректный срок действия', 422);
    }

    if ($action === 'extend' && !$currentSubscription) {
        $pdo->rollBack();
        errorResponse('У пользователя нет активной подписки для продления', 422);
    }

    if (
        $action === 'extend'
        && $currentSubscription
        && empty($currentSubscription['expires_at'])
    ) {
        $pdo->rollBack();
        errorResponse('Бессрочную подписку продлевать не нужно', 422);
    }

    $startsAt = (new DateTimeImmutable())->format('Y-m-d H:i:s');
    $expiresAt = null;

    if ($action === 'forever') {
        $expiresAt = null;
    } elseif ($action === 'extend') {
        $baseDate = new DateTimeImmutable();

        if (!empty($currentSubscription['expires_at'])) {
            $currentExpiresAt = new DateTimeImmutable($currentSubscription['expires_at']);

            if ($currentExpiresAt > $baseDate) {
                $baseDate = $currentExpiresAt;
            }
        }

        $expiresAt = $baseDate
            ->modify('+' . $durationDays . ' days')
            ->format('Y-m-d H:i:s');
    } else {
        $expiresAt = (new DateTimeImmutable())
            ->modify('+' . $durationDays . ' days')
            ->format('Y-m-d H:i:s');
    }

    $cancelStmt = $pdo->prepare("
        UPDATE user_subscriptions
        SET
            starts_at = starts_at,
            status = 'cancelled',
            updated_at = NOW()
        WHERE user_id = :user_id
        AND status = 'active'
    ");

    $cancelStmt->execute([
        'user_id' => $userId,
    ]);

    $insertStmt = $pdo->prepare("
        INSERT INTO user_subscriptions (
            user_id,
            plan_id,
            source,
            status,
            starts_at,
            expires_at,
            created_at,
            updated_at
        ) VALUES (
            :user_id,
            :plan_id,
            'admin',
            'active',
            :starts_at,
            :expires_at,
            NOW(),
            NOW()
        )
    ");

    $insertStmt->execute([
        'user_id' => $userId,
        'plan_id' => (int) $plan['id'],
        'starts_at' => $startsAt,
        'expires_at' => $expiresAt,
    ]);

    $subscriptionId = (int) $pdo->lastInsertId();

    $description = match ($action) {
        'forever' => 'Выдана бессрочная подписка: ' . $plan['title'],
        'extend' => 'Продлена подписка: ' . $plan['title'],
        default => 'Назначена подписка: ' . $plan['title'],
    };

    $logAction = match ($action) {
        'forever' => 'set_forever_subscription',
        'extend' => 'extend_subscription',
        default => 'update_subscription',
    };

    writeModeratorLog(
        (int) $adminUser['id'],
        $logAction,
        'user',
        $userId,
        $description . ' пользователю ' . ($user['email'] ?? ('#' . $userId))
    );

    $pdo->commit();

    successResponse([
        'message' => $description,
        'user_id' => $userId,
        'subscription_id' => $subscriptionId,
        'expires_at' => $expiresAt,
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    errorResponse('Не удалось обновить подписку пользователя', 500, [
        'error' => $e->getMessage(),
    ]);
}
