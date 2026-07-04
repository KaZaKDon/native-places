import { Link } from "react-router-dom";

const STATUS_LABELS = {
    new: "Новое",
    in_work: "В работе",
    closed: "Рассмотрено",
};

function formatDate(value) {
    if (!value || value === "—") {
        return "—";
    }

    const date = new Date(value.replace(" ", "T"));

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getShortText(value) {
    if (!value) {
        return "—";
    }

    return value.length > 90 ? `${value.slice(0, 90)}...` : value;
}

export function AppealsTable({ appeals }) {
    if (appeals.length === 0) {
        return (
            <div className="appeals-empty">
                Обращений в этом разделе пока нет.
            </div>
        );
    }

    return (
        <div className="appeals-table-wrap">
            <table className="appeals-table">
                <thead>
                    <tr>
                        <th>Обращение</th>
                        <th>Пользователь</th>
                        <th>Контакт</th>
                        <th>Статус</th>
                        <th>Дата</th>
                        <th>Действия</th>
                    </tr>
                </thead>

                <tbody>
                    {appeals.map((appeal) => (
                        <tr key={appeal.id}>
                            <td>
                                <div className="appeal-title-cell">
                                    <strong>{appeal.title}</strong>
                                    <span>{getShortText(appeal.message)}</span>
                                </div>
                            </td>

                            <td>{appeal.userName}</td>

                            <td>{appeal.contact || "—"}</td>

                            <td>
                                {STATUS_LABELS[appeal.status] ||
                                    appeal.status ||
                                    "—"}
                            </td>

                            <td>{formatDate(appeal.createdAt)}</td>

                            <td>
                                <Link
                                    className="table-inline-link"
                                    to={`/appeals/view/${appeal.id}`}
                                >
                                    Открыть
                                </Link>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}