export function PlaceHistory({ history }) {
    if (!history.length) {
        return (
            <article className="place-section">
                <h3>История объявления</h3>

                <p className="place-history-empty">
                    История действий пока пуста.
                </p>
            </article>
        );
    }

    return (
        <article className="place-section">
            <h3>История объявления</h3>

            <div className="place-history">
                {history.map((item) => (
                    <div key={item.id} className="place-history-item">
                        <div className="place-history-item__marker" />

                        <div>
                            <div className="place-history-item__meta">
                                {item.date} · {item.time}
                            </div>

                            <strong>{item.title}</strong>

                            <p>{item.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </article>
    );
}