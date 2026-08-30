export const LEGAL_DOCUMENT_VERSION = "0.9";

export const publicLegalDocumentLinks = Object.freeze([
    {
        code: "user_agreement",
        path: "/legal/user-agreement",
        title: "Пользовательское соглашение",
    },
    {
        code: "privacy_policy",
        path: "/legal/privacy",
        title: "Политика обработки персональных данных и конфиденциальности",
    },
    {
        code: "personal_data_consent",
        path: "/legal/personal-data-consent",
        title: "Согласие на обработку персональных данных",
    },
    {
        code: "publication_data_consent",
        path: "/legal/publication-consent",
        title: "Согласие на публикацию выбранных персональных данных",
    },
    {
        code: "marketing_consent",
        path: "/legal/marketing-consent",
        title: "Согласие на информационные и рекламные сообщения",
    },
    {
        code: "content_rules",
        path: "/legal/content-rules",
        title: "Правила размещения материалов и модерации",
    },
    {
        code: "cookie_policy",
        path: "/legal/cookies",
        title: "Политика cookie и технических идентификаторов",
    },
    {
        code: "data_subject_requests",
        path: "/legal/data-requests",
        title: "Порядок обращений по персональным данным",
    },
    {
        code: "free_tariff_rules",
        path: "/legal/free-tariffs",
        title: "Правила бесплатных тарифов",
    },
    {
        code: "commercial_materials_rules",
        path: "/legal/commercial-materials",
        title: "Правила коммерческих и рекламных материалов",
    },
].map((document) => ({
    ...document,
    version: LEGAL_DOCUMENT_VERSION,
})));
