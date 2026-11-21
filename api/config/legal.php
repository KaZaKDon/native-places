<?php

require_once __DIR__ . '/env.php';

function getLegalDocumentVersions(): array
{
    static $versions = null;

    if ($versions !== null) {
        return $versions;
    }

    $versions = [
        'user_agreement' => envString('LEGAL_USER_AGREEMENT_VERSION', '1.0'),
        'platform_rules' => envString('LEGAL_PLATFORM_RULES_VERSION', '1.0'),
        'personal_data' => envString('LEGAL_PERSONAL_DATA_CONSENT_VERSION', '1.0'),
        'marketing_emails' => envString('LEGAL_MARKETING_CONSENT_VERSION', '1.0'),
    ];

    return $versions;
}
