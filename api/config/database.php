<?php

declare(strict_types=1);

require_once __DIR__ . '/env.php';

function getDatabaseConnection(): PDO
{
    $host = envRequired('DB_HOST');
    $name = envRequired('DB_NAME');
    $user = envRequired('DB_USER');
    $password = envRequired('DB_PASSWORD');
    $port = envInt('DB_PORT', 3306);

    if ($port < 1 || $port > 65535) {
        throw new RuntimeException('Некорректный DB_PORT');
    }

    $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";

    return new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
}
