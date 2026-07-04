import { Link } from "react-router-dom";
import { StatusBadge } from "../../../components/StatusBadge/StatusBadge";
import { EmptyState } from "../../../components/EmptyState/EmptyState";

const reportTypeLabels = {
    place: "Объявление",
    user: "Пользователь",
    review: "Отзыв",
};

export function ReportsTable({ reports }) {
    if (!reports.length) {
        return (
            <EmptyState className="reports-empty">
                Жалоб в этом разделе пока нет.
            </EmptyState>
        );
    }

    return (
        <div className="reports-table-wrap">
            <table className="reports-table">
                <thead>
                    <tr>
                        <th>Жалоба</th>
                        <th>Тип</th>
                        <th>Объект</th>
                        <th>Пользователь</th>
                        <th>Статус</th>
                        <th>Дата</th>
                        <th>Действия</th>
                    </tr>
                </thead>

                <tbody>
                    {reports.map((report) => (
                        <tr key={report.id}>
                            <td>
                                <div className="report-title-cell">
                                    <span>#{report.id}</span>
                                    <strong>{report.title}</strong>
                                </div>
                            </td>

                            <td>{reportTypeLabels[report.type] || report.type}</td>

                            <td>
                                {report.placeId ? (
                                    <Link className="table-inline-link" to={`/places/view/${report.placeId}`}>
                                        {report.placeTitle}
                                    </Link>
                                ) : (
                                    "—"
                                )}
                            </td>

                            <td>
                                {report.userId ? (
                                    <Link className="table-inline-link" to={`/users/view/${report.userId}`}>
                                        {report.userName}
                                    </Link>
                                ) : (
                                    "—"
                                )}
                            </td>

                            <td>
                                <StatusBadge status={report.status} />
                            </td>

                            <td>{report.createdAt}</td>

                            <td>
                                <Link className="table-action" to={`/reports/view/${report.id}`}>
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