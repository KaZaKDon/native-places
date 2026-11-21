<?php

function jsonResponse(array $data, int $statusCode = 200): void
{
    http_response_code($statusCode);

    header('Content-Type: application/json; charset=utf-8');

    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    exit;
}

function successResponse(array $data = [], int $statusCode = 200): void
{
    jsonResponse([
        'success' => true,
        'data' => $data,
    ], $statusCode);
}

function errorResponse(string $message, int $statusCode = 400, array $extra = []): void
{
    jsonResponse([
        'success' => false,
        'message' => $message,
        'extra' => $extra,
    ], $statusCode);
}
