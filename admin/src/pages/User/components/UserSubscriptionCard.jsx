import { useEffect, useState } from "react";

import { plansApi } from "../../../shared/api/plansApi";
import { usersApi } from "../../../shared/api/usersApi";

const actionItems = [
    {
        value: "assign",
        title: "Выдать / сменить тариф",
    },
    {
        value: "extend",
        title: "Продлить тариф",
    },
    {
        value: "forever",
        title: "Сделать бессрочным",
    },
    {
        value: "disable",
        title: "Отключить подписку",
    },
];

const sourceLabels = {
    admin: "Выдан администратором",
    payment: "Онлайн-оплата",
    receipt: "Оплата по квитанции",
    promo: "Промо-доступ",
};

const statusLabels = {
    active: "Активна",
    cancelled: "Отключена",
    expired: "Истекла",
};

function getSourceLabel(source) {
    return sourceLabels[source] || source || "—";
}

function getPaymentLabel(source) {
    switch (source) {
        case "admin":
            return "Не требуется";

        case "promo":
            return "Промо-доступ";

        case "payment":
            return "Оплачено";

        case "receipt":
            return "Подтверждено администратором";

        default:
            return "—";
    }
}

function getStatusLabel(status) {
    return statusLabels[status] || status || "—";
}

export function UserSubscriptionCard({
    userId,
    subscription,
    onUpdated,
    canManage = true,
}) {
    const [plans, setPlans] = useState([]);
    const [planId, setPlanId] = useState("");
    const [action, setAction] = useState("assign");

    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (!canManage) {
            return undefined;
        }

        let isMounted = true;

        async function loadPlans() {
            try {
                const data = await plansApi.getPlans();

                if (isMounted) {
                    setPlans(
                        (data.plans || []).filter(
                            (plan) => Number(plan.is_active) === 1
                        )
                    );
                }
            } catch {
                if (isMounted) {
                    setPlans([]);
                }
            }
        }

        loadPlans();

        return () => {
            isMounted = false;
        };
    }, [canManage]);

    async function handleSubmit(event) {
        event.preventDefault();

        try {
            setIsSaving(true);
            setMessage("");

            await usersApi.updateSubscription({
                user_id: userId,
                plan_id: planId ? Number(planId) : 0,
                action,
            });

            setMessage("Подписка обновлена");

            if (onUpdated) {
                await onUpdated();
            }
        } catch (error) {
            setMessage(error.message || "Не удалось обновить подписку");
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <article className="user-section">
            <h3>Подписка</h3>

            {!subscription ? (
                <p className="user-history-empty">
                    Подписка отсутствует
                </p>
            ) : (
                <div className="user-info-list">
                    <div>
                        <span>Тариф</span>
                        <strong>{subscription.plan_title || "—"}</strong>
                    </div>

                    <div>
                        <span>Стоимость тарифа</span>

                        <strong>
                            {Number(
                                subscription.plan_price || 0
                            ).toLocaleString("ru-RU")} ₽
                        </strong>
                    </div>

                    <div>
                        <span>Получение</span>

                        <strong>
                            {getSourceLabel(subscription.source)}
                        </strong>
                    </div>

                    <div>
                        <span>Оплата</span>

                        <strong>
                            {getPaymentLabel(subscription.source)}
                        </strong>
                    </div>

                    <div>
                        <span>Статус</span>

                        <strong>
                            {getStatusLabel(subscription.status)}
                        </strong>
                    </div>

                    <div>
                        <span>Начало действия</span>

                        <strong>
                            {subscription.starts_at || "—"}
                        </strong>
                    </div>

                    <div>
                        <span>Окончание</span>

                        <strong>
                            {subscription.expires_at || "Бессрочно"}
                        </strong>
                    </div>
                </div>
            )}

            {canManage ? (
                <form
                    className="user-management"
                    onSubmit={handleSubmit}
                >
                    <label className="user-management__field">
                        <span>Действие</span>

                        <select
                            value={action}
                            onChange={(event) =>
                                setAction(event.target.value)
                            }
                            disabled={isSaving}
                        >
                            {actionItems.map((item) => (
                                <option
                                    key={item.value}
                                    value={item.value}
                                >
                                    {item.title}
                                </option>
                            ))}
                        </select>
                    </label>
                    {action !== "disable" && (
                        <label className="user-management__field">
                            <span>Тариф</span>

                            <select
                                value={planId}
                                onChange={(event) =>
                                    setPlanId(event.target.value)
                                }
                                disabled={isSaving}
                                required
                            >
                                <option value="">
                                    Выберите тариф
                                </option>

                                {plans.map((plan) => (
                                    <option
                                        key={plan.id}
                                        value={plan.id}
                                    >
                                        {plan.title}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}

                    <button
                        className="user-action-button user-action-button--primary"
                        type="submit"
                        disabled={isSaving}
                    >
                        {isSaving
                            ? "Сохраняем..."
                            : "Сохранить подписку"}
                    </button>

                    {message && (
                        <p className="user-history-empty">
                            {message}
                        </p>
                    )}
                </form>
            ) : null}
        </article>
    );
}