import { apiClient } from "./apiClient.js";

export const profileApi = {
    getProfile() {
        return apiClient.get("/profile/index.php");
    },

    updateProfile({ firstName, profileStatus, phone, telegram }) {
        return apiClient.post("/profile/update.php", {
            first_name: firstName,
            profile_status: profileStatus,
            phone,
            telegram,
        });
    },

    uploadAvatar(file) {
        const formData = new FormData();

        formData.append("avatar", file);

        return apiClient.postForm("/profile/avatar.php", formData);
    },

    changePassword({ currentPassword, newPassword }) {
        return apiClient.post("/profile/password.php", {
            current_password: currentPassword,
            new_password: newPassword,
        });
    },
};