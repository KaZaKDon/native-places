import { EmptyState } from "../../../components/EmptyState/EmptyState";

export function RecentEventsTable({ events }) {
    return (
        <article className="statistics-card statistics-card--wide">
            <div className="statistics-card__header">
                <div>
                    <h3>Последние события</h3>
                    <p>
                        Недавние действия пользователей, модераторов и системы.
                    </p>
                </div>
            </div>

            {!events.length ? (
                <EmptyState className="statistics-empty">
                    Событий пока нет.
                </EmptyState>
            ) : (
                <div className="statistics-table-wrap">
                    <table className="statistics-table">
                        <thead>
                            <tr>
                                <th>Время</th>
                                <th>Событие</th>
                                <th>Раздел</th>
                            </tr>
                        </thead>

                        <tbody>
                            {events.map((event) => (
                                <tr key={event.id}>
                                    <td>
                                        <span className="statistics-event-time">
                                            {event.time}
                                        </span>
                                    </td>

                                    <td>{event.title}</td>

                                    <td>
                                        <span className="statistics-section-badge">
                                            {event.section}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </article>
    );
}