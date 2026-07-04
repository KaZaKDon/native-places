import "./DashboardPanel.css";

export function DashboardPanel({ title, count, children }) {
    return (
        <div className="dashboard-panel">
            <div className="dashboard-panel__header">
                <h3>{title}</h3>

                {count !== null && count !== undefined ? (
                    <span>{count}</span>
                ) : null}
            </div>

            <div className="dashboard-panel__body">{children}</div>
        </div>
    );
}