<?php

function requireHttpMethod(string ...$allowedMethods): void
{
    $requestMethod = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    $allowedMethods = array_map('strtoupper', $allowedMethods);

    if (!in_array($requestMethod, $allowedMethods, true)) {
        header('Allow: ' . implode(', ', $allowedMethods));
        errorResponse('Метод запроса не поддерживается', 405);
    }
}

function readJsonBody(): array
{
    $rawBody = file_get_contents('php://input');

    if ($rawBody === false) {
        errorResponse('Не удалось прочитать тело запроса', 400);
    }

    try {
        $input = json_decode($rawBody, true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException $e) {
        errorResponse('Некорректный JSON', 400);
    }

    if (!is_array($input)) {
        errorResponse('Некорректный JSON', 400);
    }

    return $input;
}
