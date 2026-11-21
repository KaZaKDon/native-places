<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../../shared/response.php';

session_start();

unset($_SESSION['admin_user']);

successResponse([
    'message' => 'Выход из админки выполнен',
    'authenticated' => false,
    'user' => null,
]);
