<?php

const NATIVE_PLACES_PAID_SERVICES_ENABLED = false;

const NATIVE_PLACES_LEGAL_DOCUMENTS = [
    'user_agreement' => [
        'version' => '0.9',
        'hash' => '401aa87c3a9dca16d3e22b1c562f68da140b3415d2be863e4231959cddfeb2dd',
    ],
    'privacy_policy' => [
        'version' => '0.9',
        'hash' => 'a55f3d0b664a70c4136c77ca3611afc59dbde4b65a9e6239cf58f8f33dad0a4e',
    ],
    'personal_data_consent' => [
        'version' => '0.9',
        'hash' => 'dd0ef102192d0986b307910848b6c11b8a909ea317cdc0b980669ebf16a34183',
    ],
    'publication_data_consent' => [
        'version' => '0.9',
        'hash' => 'cfa9eeae447d84fec39e628cb914effe1694bb41e2cdecfc07117eedf461c5e8',
    ],
    'marketing_consent' => [
        'version' => '0.9',
        'hash' => '006bdb0046702417a894adcce536e9a96b22df36def5e67a64139faffbabb958',
    ],
    'content_rules' => [
        'version' => '0.9',
        'hash' => '5ae830218067bee20c915f3435f01d5fc2c11b55ae6d1d0cb0a021701629b320',
    ],
    'cookie_policy' => [
        'version' => '0.9',
        'hash' => 'd0b75b5b1f69fbbdcd179d9f7fde2839d5d5787684aee9dae9b791ebfb2c5111',
    ],
    'data_subject_requests' => [
        'version' => '0.9',
        'hash' => 'b130357cf6c849992a9da7761fff17f0d900cf9e6a33ccfa1b120d50ff89fc4a',
    ],
    'free_tariff_rules' => [
        'version' => '0.9',
        'hash' => 'd04d385025ebbe0a7697d8006ba43b9ea063ee402d621595dd6f2c1aad33d788',
    ],
    'commercial_materials_rules' => [
        'version' => '0.9',
        'hash' => '88950ca4a3d09a09ade03e915f7e0490b294980b74c973ee4f67c82344733551',
    ],
    'paid_services_offer' => [
        'version' => '0.9',
        'hash' => '1d8f86ff3bb0ffbd4d87778a1174702fa0ed6533dc2a46b94242cf62bf36d0b3',
    ],
];

function validateLegalAcceptancePayload(array $payload, array $requiredDocumentTypes): array
{
    $documents = $payload['documents'] ?? null;

    if (!is_array($documents)) {
        throw new InvalidArgumentException('Не подтверждено ознакомление с юридическими документами');
    }

    $validated = [];

    foreach ($documents as $document) {
        if (!is_array($document)) {
            continue;
        }

        $type = trim((string) ($document['document_type'] ?? ''));
        $version = trim((string) ($document['document_version'] ?? ''));
        $hash = strtolower(trim((string) ($document['document_hash'] ?? '')));
        $serverDocument = NATIVE_PLACES_LEGAL_DOCUMENTS[$type] ?? null;

        if (!$serverDocument) {
            continue;
        }

        if (
            !hash_equals($serverDocument['version'], $version)
            || !hash_equals($serverDocument['hash'], $hash)
        ) {
            throw new InvalidArgumentException(
                'Редакция документа изменилась. Обновите страницу и ознакомьтесь с документом повторно: ' . $type
            );
        }

        $validated[$type] = [
            'document_type' => $type,
            'document_version' => $serverDocument['version'],
            'document_hash' => $serverDocument['hash'],
        ];
    }

    foreach ($requiredDocumentTypes as $requiredType) {
        if (!isset($validated[$requiredType])) {
            throw new InvalidArgumentException('Не подтверждён обязательный документ: ' . $requiredType);
        }
    }

    return array_values($validated);
}

function recordUserLegalAcceptances(
    PDO $pdo,
    int $userId,
    array $documents,
    string $source,
    string $action = 'accepted',
    ?string $scopeType = null,
    ?int $scopeId = null,
    ?array $metadata = null
): void {
    if (!in_array($action, ['accepted', 'updated', 'withdrawn'], true)) {
        throw new InvalidArgumentException('Некорректное юридическое событие');
    }

    $stmt = $pdo->prepare("
        INSERT INTO user_legal_acceptances (
            user_id,
            document_type,
            document_version,
            document_hash,
            action,
            source,
            scope_type,
            scope_id,
            metadata_json,
            ip_address,
            user_agent,
            event_at
        ) VALUES (
            :user_id,
            :document_type,
            :document_version,
            :document_hash,
            :action,
            :source,
            :scope_type,
            :scope_id,
            :metadata_json,
            :ip_address,
            :user_agent,
            UTC_TIMESTAMP()
        )
    ");

    $ipAddress = trim((string) ($_SERVER['REMOTE_ADDR'] ?? ''));
    $userAgent = trim((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''));
    $metadataJson = $metadata === null
        ? null
        : json_encode($metadata, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);

    foreach ($documents as $document) {
        $stmt->execute([
            'user_id' => $userId,
            'document_type' => $document['document_type'],
            'document_version' => $document['document_version'],
            'document_hash' => $document['document_hash'],
            'action' => $action,
            'source' => substr($source, 0, 50),
            'scope_type' => $scopeType !== null ? substr($scopeType, 0, 50) : null,
            'scope_id' => $scopeId,
            'metadata_json' => $metadataJson,
            'ip_address' => $ipAddress !== '' ? substr($ipAddress, 0, 45) : null,
            'user_agent' => $userAgent !== '' ? substr($userAgent, 0, 512) : null,
        ]);
    }
}
