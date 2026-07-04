export function StatisticsSummary({ items }) {
    return (
        <div className="statistics-summary">
            {items.map((item) => (
                <article className="statistics-summary-card" key={item.id}>
                    <span>{item.title}</span>
                    <strong>{item.value}</strong>
                    <small>{item.caption}</small>
                </article>
            ))}
        </div>
    );
}