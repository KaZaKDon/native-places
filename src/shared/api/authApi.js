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
        telegram,
        acceptedTerms,
        acceptedPersonalData,
        acceptedMarketing,
    }) {
        return apiClient.post("/auth/register.php", {
            email,
            password,
            first_name: firstName,
            profile_status: profileStatus,
            phone,
            telegram,
            accepted_terms: acceptedTerms,
            accepted_personal_data: acceptedPersonalData,
            accepted_marketing: acceptedMarketing,
        });
    },

    verifyEmail(token) {
        return apiClient.post("/auth/verify-email.php", {
            token,
        });
    },

    resendVerification(email) {
        return apiClient.post("/auth/resend-verification.php", {
            email,
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