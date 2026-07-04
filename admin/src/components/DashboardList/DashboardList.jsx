import "./DashboardList.css";

export function DashboardList({ items, renderItem }) {
    if (!items.length) {
        return (
            <div className="dashboard-list-empty">
                Данных пока нет
            </div>
        );
    }

    return (
        <div className="dashboard-list">
            {items.map((item) => (
                <div key={item.id} className="dashboard-list-item">
                    {renderItem(item)}
                </div>
            ))}
        </div>
    );
}