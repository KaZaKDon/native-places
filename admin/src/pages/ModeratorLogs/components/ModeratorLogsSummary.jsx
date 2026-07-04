export function ModeratorLogsSummary({ summary }) {
    return (
        <div className="moderator-logs-summary">
            <article className="moderator-logs-summary-card">
                <span>Всего действий</span>
                <strong>{summary.total}</strong>
            </article>

            <article className="moderator-logs-summary-card">
                <span>Сегодня</span>
                <strong>{summary.today}</strong>
            </article>

            <article className="moderator-logs-summary-card">
                <span>Объявления</span>
                <strong>{summary.places}</strong>
            </article>

            <article className="moderator-logs-summary-card">
                <span>Жалобы и отзывы</span>
                <strong>{summary.reportsAndReviews}</strong>
            </article>
        </div>
    );
}