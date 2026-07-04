export function PlansStats({ stats }) {
    return (
        <div className="plans-stats">
            <article className="plans-stat-card">
                <span>Всего тарифов</span>
                <strong>{stats.total}</strong>
            </article>

            <article className="plans-stat-card">
                <span>Активных</span>
                <strong>{stats.active}</strong>
            </article>

            <article className="plans-stat-card">
                <span>Отключенных</span>
                <strong>{stats.disabled}</strong>
            </article>

            <article className="plans-stat-card">
                <span>Архивных</span>
                <strong>{stats.archived}</strong>
            </article>
        </div>
    );
}