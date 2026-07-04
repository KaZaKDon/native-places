import { apiClient } from "./apiClient";

function normalizePayment(data = {}) {
    return {
        paymentId: data.payment_id || data.id || null,
        status: data.status || "",
        paymentRequired: Boolean(data.payment_required ?? true),
        confirmationUrl: data.confirmation_url || "",
        message: data.message || "Платёж создан",
    };
}

export const paymentsApi = {
    async createPayment({ paymentId, planId, placeId, returnUrl } = {}) {
        const data = await apiClient.post("/payments/create.php", {
            payment_id: paymentId,
            plan_id: planId,
            place_id: placeId,
            return_url: returnUrl,
        });

        return normalizePayment(data);
    },

    async getPaymentStatus(paymentId) {
        const data = await apiClient.get("/payments/status.php", {
            payment_id: paymentId,
        });

        return normalizePayment(data);
    },
};