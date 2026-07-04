import {
    apiClient
} from "./apiClient.js";

export const authApi = {
    me() {
        return apiClient.get("/auth/me.php");
    },

    login({
        email,
        password
    }) {
        return apiClient.post("/auth/login.php", {
            email,
            password,
        });
    },

    register({
        email,
        password,
        firstName,
        profileStatus,
        phone,
        telegram
    }) {
        return apiClient.post("/auth/register.php", {
            email,
            password,
            first_name: firstName,
            profile_status: profileStatus,
            phone,
            telegram,
        });
    },

    requestPasswordReset({
        email
    }) {
        return apiClient.post("/auth/forgot-password.php", {
            email,
        });
    },

    resetPassword({
        token,
        password
    }) {
        return apiClient.post("/auth/reset-password.php", {
            token,
            password,
        });
    },

    logout() {
        return apiClient.post("/auth/logout.php");
    },
};