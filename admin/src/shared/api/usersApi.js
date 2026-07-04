import { apiClient } from "./apiClient";

export const usersApi = {
    getUsers() {
        return apiClient.get("/admin/users/index.php");
    },

    getUser(userId) {
        return apiClient.get(`/admin/users/show.php?id=${userId}`);
    },

    updateSubscription(payload) {
        return apiClient.post("/admin/users/update-subscription.php", payload);
    },

    makeModerator(userId) {
        return apiClient.post("/admin/users/make-moderator.php", {
            user_id: userId,
        });
    },

    generateModeratorCode(userId, expiresDays = 30) {
        return apiClient.post("/admin/users/generate-moderator-code.php", {
            user_id: userId,
            expires_days: expiresDays,
        });
    },
};