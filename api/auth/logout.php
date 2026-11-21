<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/request.php';
require_once __DIR__ . '/../shared/session.php';

try {
    requireHttpMethod('POST');
    startAppSession();
    destroyAppSession();

    successResponse([
        'message' => 'Выход выполнен успешно',
        'authenticated' => false,
        'user' => null,
    ]);
} catch (Throwable $e) {
    error_log('[auth/logout] ' . $e::class . ': ' . $e->getMessage());
    errorResponse('Не удалось завершить сессию', 500);
}
