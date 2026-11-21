<?php

require_once __DIR__ . '/../../shared/response.php';
require_once __DIR__ . '/../../config/database.php';

function getCurrentAdminUser(): ?array
{
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }

    if (empty($_SESSION['admin_user']) || !is_array($_SESSION['admin_user'])) {
        return null;
    }

    return $_SESSION['admin_user'];
}

function requireAdmin(): array
{
    $adminUser = getCurrentAdminUser();

    if (!$adminUser) {
        errorResponse('Требуется авторизация администратора', 401);
    }

    if (($adminUser['role_code'] ?? '') !== 'admin') {
        errorResponse('Недостаточно прав администратора', 403);
    }

    return $adminUser;
}

function requireAdminOrModerator(): array
{
    $adminUser = getCurrentAdminUser();

    if (!$adminUser) {
        errorResponse('Требуется авторизация администратора или модератора', 401);
    }

    $roleCode = $adminUser['role_code'] ?? '';

    if (!in_array($roleCode, ['admin', 'moderator'], true)) {
        errorResponse('Недостаточно прав', 403);
    }

    return $adminUser;
}
