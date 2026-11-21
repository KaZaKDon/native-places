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

$routeId = (int) ($input['route_id'] ?? 0);
$title = trim($input['title'] ?? '');
$description = trim($input['description'] ?? '');
$isPublic = !empty($input['is_public']) ? 1 : 0;

if ($routeId <= 0) {
errorResponse('Не передан ID маршрута', 400);
}

if ($title === '') {
errorResponse('Введите название маршрута', 422);
}

try {

$pdo = getDatabaseConnection();

$routeStmt = $pdo->prepare("
SELECT id
FROM routes
WHERE id = :route_id
AND user_id = :user_id
AND status = 'active'
LIMIT 1
");

$routeStmt->execute([
'route_id' => $routeId,
'user_id' => $userId,
]);

$route = $routeStmt->fetch();

if (!$route) {
errorResponse('Активный маршрут не найден или нет доступа', 404);
}

$updateStmt = $pdo->prepare("
UPDATE routes
SET
title = :title,
description = :description,
is_public = :is_public,
updated_at = NOW()
WHERE id = :route_id
LIMIT 1
");

$updateStmt->execute([
'title' => $title,
'description' => $description !== '' ? $description : null,
'is_public' => $isPublic,
'route_id' => $routeId,
]);

successResponse([
'message' => 'Маршрут обновлён',
'route_id' => $routeId,
]);

} catch (Throwable $e) {

errorResponse(
'Не удалось обновить маршрут',
500,
[
'error' => $e->getMessage(),
]
);
}
