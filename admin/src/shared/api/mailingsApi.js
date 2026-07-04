import {
    apiClient
} from "./apiClient";

export const mailingsApi = {
    getOptions() {
        return apiClient.get(
            "/admin/mailings/options.php"
        );
    },

    getMailings() {
        return apiClient.get(
            "/admin/mailings/index.php"
        );
    },

    previewAudience(payload) {
        return apiClient.post(
            "/admin/mailings/preview.php",
            payload
        );
    },

    createMailing(payload) {
        return apiClient.post(
            "/admin/mailings/send.php",
            payload
        );
    },

    deleteMailing(mailingId) {
        return apiClient.post(
            "/admin/mailings/delete.php", {
                mailing_id: mailingId,
            }
        );
    },
};