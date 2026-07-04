import "./StatusBadge.css";

const statusLabels = {
    pending: "На модерации",
    published: "Опубликовано",
    rejected: "Отклонено",
    expired: "Архив",
    active: "Активен",
    blocked: "Заблокирован",
    paid: "Оплачен",
    waiting: "Ожидает",
    new: "Новая",
    processing: "В работе",
    resolved: "Решена",
    failed: "Ошибка",
};

export function StatusBadge({ status, label }) {
    return (
        <span className={`status-label status-label--${status}`}>
            {label || statusLabels[status] || status}
        </span>
    );
}