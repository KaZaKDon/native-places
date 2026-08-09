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

    startMailing(mailingId) {
        return apiClient.post(
            "/admin/mailings/start.php", {
                mailing_id: mailingId,
            }
        );
    },

    processMailing(mailingId, limit = 25) {
        return apiClient.post(
            "/admin/mailings/process.php", {
                mailing_id: mailingId,
                limit,
            }
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