<?php

require_once __DIR__ . '/session.php';

function getCurrentUserId(): ?int
{
    startAppSession();

    if (empty($_SESSION['user_id'])) {
        return null;
    }

    return (int) $_SESSION['user_id'];
}

function requireAuth(): int
{
    $userId = getCurrentUserId();

    if (!$userId) {
        errorResponse('Требуется авторизация', 401);
    }

    return $userId;
}
