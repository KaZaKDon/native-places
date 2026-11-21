<?php
declare(strict_types=1);

require_once __DIR__ . '/../../shared/cors.php';
require_once __DIR__ . '/../shared/require-admin.php';

// Deliberately restrict directory writes to administrators for v0.1.
function directoryRequireMethod(string $method): void {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== $method) {
        header('Allow: ' . $method);
        errorResponse('Метод не поддерживается', 405);
    }
}

function directoryCsrfToken(): string {
    if (session_status() !== PHP_SESSION_ACTIVE) session_start();
    if (empty($_SESSION['directory_csrf_token'])) {
        $_SESSION['directory_csrf_token'] = bin2hex(random_bytes(32));
    }
    return (string) $_SESSION['directory_csrf_token'];
}

function directoryAssertCsrf(array $payload): void {
    // Defend against cross-site requests even if host CORS settings change.
    $origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
    if ($origin !== '') {
        $originHost = strtolower((string) parse_url($origin, PHP_URL_HOST));
        $requestHost = strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''));
        $requestHost = explode(':', $requestHost, 2)[0];
        if ($originHost === '' || $originHost !== $requestHost) {
            errorResponse('Недопустимый источник запроса', 403);
        }
    }
    $expected = directoryCsrfToken();
    $received = (string) ($payload['csrf_token'] ?? '');
    if (!hash_equals($expected, $received)) {
        errorResponse('Сессия формы устарела. Обновите страницу.', 403);
    }
}

function directoryString(array $payload, string $name, int $max): string {
    $value = $payload[$name] ?? '';
    if (!is_string($value)) errorResponse('Некорректное поле: ' . $name, 422);
    $value = trim($value);
    if (mb_strlen($value, 'UTF-8') > $max) errorResponse('Слишком длинное поле: ' . $name, 422);
    return $value;
}

function directoryValidateCoordinates(mixed $value, int $depth, int &$points): void {
    if ($depth > 4 || !is_array($value) || array_is_list($value) === false) {
        errorResponse('Некорректные координаты GeoJSON', 422);
    }
    if (count($value) >= 2 && is_numeric($value[0]) && is_numeric($value[1])) {
        if ($depth !== 0 || count($value) !== 2) errorResponse('Координаты должны состоять из долготы и широты', 422);
        $lon = (float) $value[0]; $lat = (float) $value[1];
        if (!is_finite($lon) || !is_finite($lat) || abs($lon) > 180 || abs($lat) > 90) {
            errorResponse('Координаты выходят за границы WGS84', 422);
        }
        ++$points;
        if ($points > 20000) errorResponse('Слишком много точек геометрии', 422);
        return;
    }
    foreach ($value as $part) directoryValidateCoordinates($part, $depth - 1, $points);
}

function directoryGeometry(array $payload, string $type): ?string {
    $raw = $payload['geometry_geojson'] ?? '';
    if (!is_string($raw)) errorResponse('Неверный GeoJSON', 422);
    $raw = trim($raw);
    if ($raw === '') return null;
    if (strlen($raw) > 250000) errorResponse('Геометрия превышает 250 КБ', 422);
    $geom = json_decode($raw, true);
    if (!is_array($geom) || !isset($geom['type'], $geom['coordinates']) || !is_array($geom['coordinates'])) {
        errorResponse('Ожидается GeoJSON Geometry с coordinates', 422);
    }
    $geometryType = $geom['type'];
    $allowed = match ($type) {
        'river' => ['LineString', 'MultiLineString'],
        'lake', 'forest', 'natural_area', 'hunting_ground' => ['Polygon', 'MultiPolygon'],
        'landmark', 'spring' => ['Point'],
        default => [],
    };
    if (!in_array($geometryType, $allowed, true)) errorResponse('Тип геометрии не соответствует объекту', 422);
    $points = 0;
    $initialDepth = match ($geometryType) {
        'Point' => 0,
        'LineString' => 1,
        'Polygon', 'MultiLineString' => 2,
        'MultiPolygon' => 3,
    };
    directoryValidateCoordinates($geom['coordinates'], $initialDepth, $points);
    if ($points < ($geometryType === 'Point' ? 1 : ($geometryType === 'LineString' ? 2 : 4))) {
        errorResponse('Недостаточно координат геометрии', 422);
    }
    // Canonical geometry: store only type and coordinates, no untrusted properties.
    return json_encode(['type' => $geometryType, 'coordinates' => $geom['coordinates']], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}
