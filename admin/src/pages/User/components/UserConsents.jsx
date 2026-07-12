const consentTypeLabels = {
    terms: "Правила сайта",
    personal_data: "Персональные данные",
    marketing_emails: "Маркетинговые рассылки",
};

function getConsentTypeLabel(consentType) {
    return consentTypeLabels[consentType] || consentType || "—";
}

export function UserConsents({ consents = [] }) {
    return (
        <article className="user-section">
            <div className="user-section__header">
                <h3>Согласия пользователя</h3>

                <span className="user-consents-count">{consents.length}</span>
            </div>

            {!consents.length ? (
                <p className="user-consents-empty">
                    Согласия пока не найдены. Для старых аккаунтов это нормально, если они были
                    зарегистрированы до включения обязательных согласий.
                </p>
            ) : (
                <div className="user-consents-list">
                    {consents.map((consent) => (
                        <div className="user-consent-item" key={consent.id}>
                            <div className="user-consent-item__main">
                                <span>{getConsentTypeLabel(consent.consent_type)}</span>
                                <strong>{consent.accepted_at || "—"}</strong>
                            </div>

                            <dl className="user-consent-item__details">
                                <div>
                                    <dt>Версия</dt>
                                    <dd>{consent.document_version || "—"}</dd>
                                </div>

                                <div>
                                    <dt>IP</dt>
                                    <dd>{consent.ip_address || "—"}</dd>
                                </div>

                                <div>
                                    <dt>User-Agent</dt>
                                    <dd>{consent.user_agent || "—"}</dd>
                                </div>
                            </dl>
                        </div>
                    ))}
                </div>
            )}
        </article>
    );
}