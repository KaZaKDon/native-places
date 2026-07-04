import { EmptyState } from "../../../components/EmptyState/EmptyState";

function getStatusTitle(statusItems, status) {
    return statusItems.find((item) => item.value === status)?.title ?? status;
}

export function PlansTable({ plans, statusItems, onEdit, onChangeStatus }) {
    if (!plans.length) {
        return (
            <EmptyState className="plans-empty">
                Тарифов пока нет. Добавьте первый тариф через форму ниже.
            </EmptyState>
        );
    }

    return (
        <div className="plans-table-wrap">
            <table className="plans-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Название</th>
                        <th>Код</th>
                        <th>Цена</th>
                        <th>Срок</th>
                        <th>Лимит</th>
                        <th>Пользователей</th>
                        <th>Статус</th>
                        <th>Действия</th>
                    </tr>
                </thead>

                <tbody>
                    {plans.map((plan) => (
                        <tr key={plan.id}>
                            <td>
                                <span className="plan-id">#{plan.id}</span>
                            </td>

                            <td>
                                <strong>{plan.title}</strong>
                            </td>

                            <td>
                                <code className="plan-code">{plan.code}</code>
                            </td>

                            <td>{plan.price.toLocaleString("ru-RU")} ₽</td>

                            <td>{plan.durationDays} дней</td>

                            <td>{plan.placesLimit}</td>

                            <td>{plan.usersCount}</td>

                            <td>
                                <span className={`plan-status plan-status--${plan.status}`}>
                                    {getStatusTitle(statusItems, plan.status)}
                                </span>
                            </td>

                            <td>
                                <div className="plans-table-actions">
                                    <button
                                        className="table-action"
                                        type="button"
                                        onClick={() => onEdit(plan)}
                                    >
                                        Изменить
                                    </button>

                                    {plan.status === "active" ? (
                                        <button
                                            className="table-action"
                                            type="button"
                                            onClick={() => onChangeStatus(plan, "disabled")}
                                        >
                                            Отключить
                                        </button>
                                    ) : (
                                        <button
                                            className="table-action"
                                            type="button"
                                            onClick={() => onChangeStatus(plan, "active")}
                                        >
                                            Включить
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}