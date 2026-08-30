import commercialMaterials from "./10_COMMERCIAL_AND_AD_RULES.md?raw";
import contentRules from "./06_CONTENT_AND_MODERATION_RULES.md?raw";
import cookiePolicy from "./07_COOKIE_POLICY.md?raw";
import dataRequests from "./08_DATA_SUBJECT_REQUESTS.md?raw";
import freeTariffs from "./09_FREE_TARIFF_RULES.md?raw";
import marketingConsent from "./05_MARKETING_CONSENT.md?raw";
import paidOfferDraft from "./13_PAID_SERVICES_OFFER_DRAFT.md?raw";
import personalDataConsent from "./03_PERSONAL_DATA_CONSENT.md?raw";
import privacyPolicy from "./02_PRIVACY_POLICY.md?raw";
import publicationConsent from "./04_PUBLICATION_DATA_CONSENT.md?raw";
import userAgreement from "./01_USER_AGREEMENT.md?raw";
import { LEGAL_DOCUMENT_VERSION } from "./legalDocumentLinks";

export { LEGAL_DOCUMENT_VERSION } from "./legalDocumentLinks";

const documents = [
    {
        code: "user_agreement",
        slug: "user-agreement",
        title: "Пользовательское соглашение",
        shortTitle: "Соглашение",
        hash: "401aa87c3a9dca16d3e22b1c562f68da140b3415d2be863e4231959cddfeb2dd",
        content: userAgreement,
        contexts: ["registration", "account"],
    },
    {
        code: "privacy_policy",
        slug: "privacy",
        title: "Политика обработки персональных данных и конфиденциальности",
        shortTitle: "Конфиденциальность",
        hash: "a55f3d0b664a70c4136c77ca3611afc59dbde4b65a9e6239cf58f8f33dad0a4e",
        content: privacyPolicy,
        contexts: ["registration", "account", "cookies"],
    },
    {
        code: "personal_data_consent",
        slug: "personal-data-consent",
        title: "Согласие на обработку персональных данных",
        shortTitle: "Согласие на ПД",
        hash: "dd0ef102192d0986b307910848b6c11b8a909ea317cdc0b980669ebf16a34183",
        content: personalDataConsent,
        contexts: ["registration"],
    },
    {
        code: "publication_data_consent",
        slug: "publication-consent",
        title: "Согласие на публикацию выбранных персональных данных",
        shortTitle: "Публикация данных",
        hash: "cfa9eeae447d84fec39e628cb914effe1694bb41e2cdecfc07117eedf461c5e8",
        content: publicationConsent,
        contexts: ["listing"],
    },
    {
        code: "marketing_consent",
        slug: "marketing-consent",
        title: "Согласие на информационные и рекламные сообщения",
        shortTitle: "Рассылки",
        hash: "006bdb0046702417a894adcce536e9a96b22df36def5e67a64139faffbabb958",
        content: marketingConsent,
        contexts: ["registration", "account"],
    },
    {
        code: "content_rules",
        slug: "content-rules",
        title: "Правила размещения материалов и модерации",
        shortTitle: "Правила публикации",
        hash: "5ae830218067bee20c915f3435f01d5fc2c11b55ae6d1d0cb0a021701629b320",
        content: contentRules,
        contexts: ["registration", "listing", "reviews"],
    },
    {
        code: "cookie_policy",
        slug: "cookies",
        title: "Политика cookie и технических идентификаторов",
        shortTitle: "Cookie",
        hash: "d0b75b5b1f69fbbdcd179d9f7fde2839d5d5787684aee9dae9b791ebfb2c5111",
        content: cookiePolicy,
        contexts: ["cookies", "account"],
    },
    {
        code: "data_subject_requests",
        slug: "data-requests",
        title: "Порядок обращений по персональным данным",
        shortTitle: "Обращения по ПД",
        hash: "b130357cf6c849992a9da7761fff17f0d900cf9e6a33ccfa1b120d50ff89fc4a",
        content: dataRequests,
        contexts: ["account"],
    },
    {
        code: "free_tariff_rules",
        slug: "free-tariffs",
        title: "Правила бесплатных тарифов",
        shortTitle: "Бесплатные тарифы",
        hash: "d04d385025ebbe0a7697d8006ba43b9ea063ee402d621595dd6f2c1aad33d788",
        content: freeTariffs,
        contexts: ["listing", "tariff"],
    },
    {
        code: "commercial_materials_rules",
        slug: "commercial-materials",
        title: "Правила коммерческих и рекламных материалов",
        shortTitle: "Коммерческие материалы",
        hash: "88950ca4a3d09a09ade03e915f7e0490b294980b74c973ee4f67c82344733551",
        content: commercialMaterials,
        contexts: ["listing"],
    },
    {
        code: "paid_services_offer",
        slug: "paid-offer",
        title: "Публичная оферта на платные услуги",
        shortTitle: "Платная оферта",
        hash: "1d8f86ff3bb0ffbd4d87778a1174702fa0ed6533dc2a46b94242cf62bf36d0b3",
        content: paidOfferDraft,
        contexts: ["paid_tariff"],
        draft: true,
    },
].map((document) => ({
    ...document,
    version: LEGAL_DOCUMENT_VERSION,
    path: `/legal/${document.slug}`,
    robots: "noindex, nofollow",
}));

export const legalDocuments = Object.freeze(documents);

export const legalDocumentsBySlug = Object.freeze(
    Object.fromEntries(documents.map((document) => [document.slug, document]))
);

export const legalDocumentsByCode = Object.freeze(
    Object.fromEntries(documents.map((document) => [document.code, document]))
);

export function getLegalDocumentsForContext(context) {
    return documents.filter((document) => document.contexts.includes(context));
}

export function getLegalAcceptancePayload(codes) {
    return codes.map((code) => {
        const document = legalDocumentsByCode[code];

        if (!document) {
            throw new Error(`Неизвестный юридический документ: ${code}`);
        }

        return {
            document_type: document.code,
            document_version: document.version,
            document_hash: document.hash,
        };
    });
}
