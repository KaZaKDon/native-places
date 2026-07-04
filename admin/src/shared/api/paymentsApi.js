import { apiClient } from "./apiClient";

function mapPayment(payment) {
    const firstName = payment.user_first_name || "";
    const lastName = payment.user_last_name || "";

    return {
        id: Number(payment.id),
        userId: Number(payment.user_id),
        userName: `${firstName} ${lastName}`.trim() || payment.user_email || "Пользователь",

        amount: Number(payment.amount || 0),

        planTitle: payment.plan_title || "Без тарифа",
        planCode: payment.plan_code || "",

        status: payment.status || "pending",

        createdAt: payment.created_at || "",
        paidAt: payment.paid_at || "",

        subscriptionId: payment.subscription_id
            ? Number(payment.subscription_id)
            : null,

        subscriptionStatus: payment.subscription_status || "",
        subscriptionSource: payment.subscription_source || "",
    };
}

export const paymentsApi = {
    async getPayments(status = "") {
        const query = status && status !== "all"
            ? `?status=${encodeURIComponent(status)}`
            : "";

        const data = await apiClient.get(
            `/admin/payments/index.php${query}`
        );

        return {
            payments: (data.payments || []).map(mapPayment),
        };
    },

    async getPayment(id) {
        const data = await apiClient.get(
            `/admin/payments/show.php?id=${id}`
        );

        return mapPayment(data.payment);
    },
};