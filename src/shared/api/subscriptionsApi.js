import { apiClient } from "./apiClient";

function normalizePlan(plan) {
    if (!plan) {
        return null;
    }

    return {
        ...plan,
        id: Number(plan.id || 0),
        maxPlaces: Number(plan.max_places || 0),
        durationDays: Number(plan.duration_days || 0),
        price: Number(plan.price || 0),
        isActive: Number(plan.is_active ?? 1) === 1,
    };
}

function normalizeSubscriptionPayload(data = {}) {
    return {
        subscription: data.subscription || null,
        plan: normalizePlan(data.plan),
        usage: {
            used: Number(data.usage?.used || 0),
            limit: Number(data.usage?.limit || 0),
            remaining: Number(data.usage?.remaining || 0),
        },
        availablePlans: Array.isArray(data.available_plans)
            ? data.available_plans.map(normalizePlan).filter(Boolean)
            : [],
    };
}

export const subscriptionsApi = {
    async getCurrentSubscription() {
        const data = await apiClient.get("/my-subscription/current.php");

        return normalizeSubscriptionPayload(data);
    },

    async changeSubscription(planId) {
        const data = await apiClient.post("/my-subscription/change.php", {
            plan_id: planId,
        });

        return {
            ...normalizeSubscriptionPayload(data),
            paymentRequired: Boolean(data.payment_required),
            paymentId: data.payment_id || null,
            confirmationUrl: data.confirmation_url || "",
            message: data.message || "Тариф обновлён",
        };
    },
};
