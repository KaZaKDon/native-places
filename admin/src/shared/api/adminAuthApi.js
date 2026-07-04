import { apiClient } from "./apiClient";

export const adminAuthApi = {
    async loginAdmin(email, password) {
        return apiClient.post(
            "/admin/auth/login-admin.php",
            {
                email,
                password,
            }
        );
    },

    async loginCode(code) {
        return apiClient.post(
            "/admin/auth/login-code.php",
            {
                code,
            }
        );
    },

    async me() {
        return apiClient.get(
            "/admin/auth/me.php"
        );
    },

    async logout() {
        return apiClient.post(
            "/admin/auth/logout.php",
            {}
        );
    },
};