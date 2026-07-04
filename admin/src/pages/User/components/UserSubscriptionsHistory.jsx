const sourceLabels = {
    admin: "Выдан администратором",
    payment: "Онлайн-оплата",
    receipt: "Квитанция",
    promo: "Промо",
    gift: "Подарок",
};

const statusLabels = {
    active: "Активна",
    cancelled: "Отключена",
    expired: "Истекла",
};

function getSourceLabel(source) {
    return sourceLabels[source] || source || "—";
}

function getStatusLabel(status) {
    return statusLabels[status] || status || "—";
}

function getExpiresLabel(subscription) {
    if (subscription.status === "active" && !subscription.expires_at) {
        return "Бессрочно";
    }

    return subscription.expires_at || "—";
}

export function UserSubscriptionsHistory({ subscriptions = [] }) {
    if (!subscriptions.length) {
        return null;
    }

    return (
        <article className="user-section">
            <h3>История подписок</h3>

            <div className="user-history">
                {subscriptions.map((subscription) => (
                    <div className="user-history-item" key={subscription.id}>
                        <span className="user-history-item__marker" />

                        <div>
                            <div className="user-history-item__meta">
                                {subscription.created_at || "—"}
                            </div>

                            <strong>{subscription.plan_title || "Без тарифа"}</strong>

                            <p>
                                {getStatusLabel(subscription.status)} ·{" "}
                                {getSourceLabel(subscription.source)} ·{" "}
                                {getExpiresLabel(subscription)}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </article>
    );
}