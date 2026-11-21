<?php

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

requireAdmin();

$input = json_decode(file_get_contents('php://input'), true);

$displayName = trim($input['display_name'] ?? '');
$expiresAt = trim($input['expires_at'] ?? '');

if ($displayName === '') {
    errorResponse('Введите имя модератора', 422);
}

try {
    $pdo = getDatabaseConnection();

    $plainCode = strtoupper(bin2hex(random_bytes(4)));
    $codeHash = password_hash($plainCode, PASSWORD_DEFAULT);

    $stmt = $pdo->prepare("
        INSERT INTO admin_access_codes (
            role_code,
            display_name,
            code_hash,
            status,
            expires_at,
            created_at
        ) VALUES (
            'moderator',
            :display_name,
            :code_hash,
            'active',
            :expires_at,
            NOW()
        )
    ");

    $stmt->execute([
        'display_name' => $displayName,
        'code_hash' => $codeHash,
        'expires_at' => $expiresAt !== '' ? $expiresAt : null,
    ]);

    successResponse([
        'message' => 'Код доступа создан',
        'access_code' => [
            'id' => (int) $pdo->lastInsertId(),
            'role_code' => 'moderator',
            'display_name' => $displayName,
            'status' => 'active',
            'expires_at' => $expiresAt !== '' ? $expiresAt : null,
            'plain_code' => $plainCode,
        ],
    ], 201);
} catch (Throwable $e) {
    errorResponse('Не удалось создать код доступа', 500, [
        'error' => $e->getMessage(),
    ]);
}
