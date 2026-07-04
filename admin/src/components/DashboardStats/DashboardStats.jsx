import { NavLink } from "react-router-dom";
import "./DashboardStats.css";

export function DashboardStats({ items }) {
    return (
        <div className="stats-grid">
            {items.map((item) => (
                <NavLink
                    key={item.title}
                    to={item.to}
                    className="stat-card stat-card--link"
                >
                    <span>{item.title}</span>

                    <strong>{item.value}</strong>

                    <p>{item.text}</p>
                </NavLink>
            ))}
        </div>
    );
}