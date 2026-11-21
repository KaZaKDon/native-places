<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../../shared/response.php';

session_start();

$adminUser = $_SESSION['admin_user'] ?? null;

if (!$adminUser) {
    successResponse([
        'authenticated' => false,
        'user' => null,
    ]);
}

successResponse([
    'authenticated' => true,
    'user' => $adminUser,
]);
