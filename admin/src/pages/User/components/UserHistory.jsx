export function UserHistory({ history }) {
    if (!history.length) {
        return (
            <article className="user-section">
                <h3>История пользователя</h3>

                <p className="user-history-empty">
                    История действий пока пуста.
                </p>
            </article>
        );
    }

    return (
        <article className="user-section">
            <h3>История пользователя</h3>

            <div className="user-history">
                {history.map((item) => (
                    <div key={item.id} className="user-history-item">
                        <div className="user-history-item__marker" />

                        <div>
                            <div className="user-history-item__meta">
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