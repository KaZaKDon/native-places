<?php
declare(strict_types=1);

// Shared rules for OOPT and hunting grounds. The parent directory entry is the only publish switch.
function directoryTerritoryType(string $type): bool {
    return in_array($type, ['protected_area', 'hunting_ground'], true);
}

function directoryTerritoryInput(array $input, string $type): ?array {
    if (!directoryTerritoryType($type)) return null;
    $fields = [
        'official_category' => 60, 'official_name' => 180, 'managing_body' => 180,
        'legal_basis_url' => 700, 'boundary_source_url' => 700,
        'access_rules' => 5000, 'access_source_url' => 700,
    ];
    $data = [];
    foreach ($fields as $name => $limit) $data[$name] = directoryString($input, $name, $limit);
    foreach (['legal_basis_url', 'boundary_source_url', 'access_source_url'] as $name) {
        $url = $data[$name];
        if ($url !== '' && (!filter_var($url, FILTER_VALIDATE_URL) ||
            !in_array(strtolower((string) parse_url($url, PHP_URL_SCHEME)), ['http', 'https'], true))) {
            errorResponse('Некорректная ссылка: ' . $name, 422);
        }
    }
    $date = directoryString($input, 'checked_at', 10);
    if ($date !== '') {
        $parsed = DateTimeImmutable::createFromFormat('!Y-m-d', $date);
        if (!$parsed || $parsed->format('Y-m-d') !== $date || $date > gmdate('Y-m-d')) {
            errorResponse('Некорректная дата проверки', 422);
        }
    }
    $data['checked_at'] = $date !== '' ? $date : null;
    if ($type === 'protected_area') {
        if ($data['official_category'] !== '' && !in_array($data['official_category'], ['zapovednik', 'zakaznik', 'national_park', 'natural_park', 'nature_monument', 'other'], true)) {
            errorResponse('Выберите официальный вид ООПТ', 422);
        }
    } else {
        $data['official_category'] = '';
    }
    return $data;
}

function directoryTerritoryAssertPublish(PDO $pdo, array $entry): void {
    if (!directoryTerritoryType((string) $entry['type'])) return;
    $stmt = $pdo->prepare('SELECT * FROM directory_territory_details WHERE entry_id=:id');
    $stmt->execute(['id' => $entry['id']]);
    $details = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$details || trim((string)$details['official_name']) === '' || trim((string)$details['legal_basis_url']) === '') {
        $pdo->rollBack();
        errorResponse('Для территории нужны официальное название и ссылка на правовой документ', 422);
    }
    if ($entry['type'] === 'protected_area' && !in_array($details['official_category'],
        ['zapovednik', 'zakaznik', 'national_park', 'natural_park', 'nature_monument', 'other'], true)) {
        $pdo->rollBack();
        errorResponse('Для ООПТ нужна официальная категория', 422);
    }
    if (!empty($entry['geometry_geojson']) && trim((string)$details['boundary_source_url']) === '') {
        $pdo->rollBack();
        errorResponse('Для публикации контура укажите официальный источник границ', 422);
    }
    if (trim((string)$details['access_rules']) !== '' &&
        (trim((string)$details['access_source_url']) === '' || !$details['checked_at'])) {
        $pdo->rollBack();
        errorResponse('Для режима посещения нужны источник и дата проверки', 422);
    }
}
