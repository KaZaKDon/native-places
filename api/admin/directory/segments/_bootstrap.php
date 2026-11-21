<?php
declare(strict_types=1);

// v0.4a: reuse the installed directory CSRF, session, authorization and response helpers.
require_once __DIR__ . '/../_bootstrap.php';

function segmentsInput(): array {
    $input = json_decode((string) file_get_contents('php://input'), true);
    if (!is_array($input) || array_is_list($input)) errorResponse('Ожидается JSON-объект', 422);
    return $input;
}

function segmentsPositiveId(mixed $value, string $field, bool $optional = false): ?int {
    if ($optional && ($value === null || $value === '' || $value === 0)) return null;
    $result = filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if ($result === false) errorResponse('Некорректный идентификатор: ' . $field, 422);
    return (int) $result;
}

function segmentsSlug(array $input): string {
    $slug = directoryString($input, 'slug', 160);
    if (!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/D', $slug)) errorResponse('Некорректный slug участка', 422);
    return $slug;
}

function segmentsGeometry(array $input): ?string {
    // The existing directory validator accepts LineString and MultiLineString for river.
    $raw = directoryGeometry($input, 'river');
    if ($raw === null) return null;
    $geom = json_decode($raw, true);
    $lines = $geom['type'] === 'LineString' ? [$geom['coordinates']] : $geom['coordinates'];
    if (!$lines) errorResponse('Геометрия участка пуста', 422);
    foreach ($lines as $line) {
        if (!is_array($line) || count($line) < 2) errorResponse('Каждая линия участка должна содержать минимум две точки', 422);
    }
    return $raw;
}
