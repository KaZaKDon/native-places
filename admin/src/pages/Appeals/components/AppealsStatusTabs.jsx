import { NavLink } from "react-router-dom";

export function AppealsStatusTabs({ items }) {
    return (
        <div className="appeals-status-tabs">
            {items.map((item) => (
                <NavLink
                    className={({ isActive }) =>
                        isActive
                            ? "appeals-status-tab appeals-status-tab--active"
                            : "appeals-status-tab"
                    }
                    key={item.value}
                    to={
                        item.value === "all"
                            ? "/appeals"
                            : `/appeals/${item.value}`
                    }
                    end={item.value === "all"}
                >
                    <span>{item.label}</span>
                    <strong>{item.count}</strong>
                </NavLink>
            ))}
        </div>
    );
}