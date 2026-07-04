import { apiClient } from "./apiClient.js";

export const REPORT_TYPES = [
    {
        value: "wrong_info",
        title: "Неверная информация",
    },
    {
        value: "not_available",
        title: "Объявление неактуально",
    },
    {
        value: "spam",
        title: "Спам или реклама",
    },
    {
        value: "fraud",
        title: "Подозрение на мошенничество",
    },
    {
        value: "other",
        title: "Другая причина",
    },
];

export const reportsApi = {
    async createReport({ placeId, reportType, message }) {
        return apiClient.post("/reports/create.php", {
            place_id: placeId,
            report_type: reportType,
            message,
        });
    },
};
