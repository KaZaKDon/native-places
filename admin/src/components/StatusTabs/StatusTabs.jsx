import { NavLink } from "react-router-dom";

export function StatusTabs({
    items,
    basePath,
    className = "status-tabs",
    itemClassName = "status-tab",
}) {
    return (
        <div className={className}>
            {items.map((item) => {
                const to = item.value === "all" ? basePath : `${basePath}/${item.value}`;

                return (
                    <NavLink
                        key={item.value}
                        to={to}
                        end={item.value === "all"}
                        className={({ isActive }) =>
                            isActive ? `${itemClassName} ${itemClassName}--active` : itemClassName
                        }
                    >
                        <span>{item.label}</span>
                        <strong>{item.count}</strong>
                    </NavLink>
                );
            })}
        </div>
    );
}