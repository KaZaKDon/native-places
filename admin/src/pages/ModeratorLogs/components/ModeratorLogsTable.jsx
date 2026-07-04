import { EmptyState } from "../../../components/EmptyState/EmptyState";

export function ModeratorLogsTable({ logs }) {
    if (!logs.length) {
        return (
            <EmptyState className="moderator-logs-empty">
                По выбранным фильтрам действий не найдено.
            </EmptyState>
        );
    }

    return (
        <div className="moderator-logs-table-wrap">
            <table className="moderator-logs-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Дата и время</th>
                        <th>Модератор</th>
                        <th>Действие</th>
                        <th>Раздел</th>
                        <th>Объект</th>
                    </tr>
                </thead>

                <tbody>
                    {logs.map((log) => (
                        <tr key={log.id}>
                            <td>
                                <span className="moderator-log-id">#{log.id}</span>
                            </td>

                            <td>
                                <span className="moderator-log-date">
                                    {log.createdAt}
                                </span>
                            </td>

                            <td>
                                <strong>{log.moderatorName}</strong>
                            </td>

                            <td>{log.actionTitle}</td>

                            <td>
                                <span className="moderator-log-section">
                                    {log.sectionTitle}
                                </span>
                            </td>

                            <td>{log.targetTitle}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}