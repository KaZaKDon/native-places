import { apiClient } from "./apiClient.js";

function mapAppealFromApi(appeal) {
    return {
        id: Number(appeal.id),
        userId: Number(appeal.user_id),
        type: appeal.appeal_type || "support",
        contact: appeal.contact || "",
        text: appeal.message || "",
        adminResponse: appeal.admin_response || "",
        status: appeal.status || "new",
        createdAt: appeal.created_at || "",
        updatedAt: appeal.updated_at || "",
        closedAt: appeal.closed_at || "",
    };
}

export const appealsApi = {
    async createAppeal({ type, contact, message }) {
        return apiClient.post("/appeals/create.php", {
            type,
            contact,
            message,
        });
    },

    async getMyAppeals() {
        const data = await apiClient.get("/appeals/my.php");

        const appeals = Array.isArray(data.appeals)
            ? data.appeals.map(mapAppealFromApi)
            : [];

        return {
            appeals,
        };
    },
};