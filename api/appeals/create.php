<?php

require_once __DIR__ . '/../shared/cors.php';
require_once __DIR__ . '/../shared/response.php';
require_once __DIR__ . '/../shared/auth.php';
require_once __DIR__ . '/../config/database.php';

$userId = requireAuth();

$input = json_decode(file_get_contents('php://input'), true);

$type = trim($input['type'] ?? '');
$contact = trim($input['contact'] ?? '');
$message = trim($input['message'] ?? '');

$allowedTypes = ['support', 'idea'];

if (!in_array($type, $allowedTypes, true)) {
    errorResponse('Некорректный тип обращения', 422);
}

if ($message === '') {
    errorResponse('Введите текст обращения', 422);
}

try {
    $pdo = getDatabaseConnection();

    $stmt = $pdo->prepare("
        INSERT INTO appeals (
            user_id,
            appeal_type,
            contact,
            message,
            admin_response,
            status,
            created_at,
            updated_at
        ) VALUES (
            :user_id,
            :appeal_type,
            :contact,
            :message,
            NULL,
            'new',
            NOW(),
            NOW()
        )
    ");

    $stmt->execute([
        'user_id' => $userId,
        'appeal_type' => $type,
        'contact' => $contact !== '' ? $contact : null,
        'message' => $message,
    ]);

    successResponse([
        'message' => 'Обращение отправлено',
        'appeal_id' => (int) $pdo->lastInsertId(),
    ], 201);
} catch (Throwable $e) {
    errorResponse('Не удалось отправить обращение', 500, [
        'error' => $e->getMessage(),
    ]);
}
