import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";

import { navigationItems } from "../../config/navigation";
import { useAdminAuth } from "../../context/useAdminAuth";
import { statisticsApi } from "../../shared/api/statisticsApi";
import { canAccessByRole } from "../../utils/access";

function getSummaryValue(summary, id) {
    return Number(summary.find((item) => item.id === id)?.value || 0);
}

function buildBadges(data) {
    return {
        places: getSummaryValue(data.summary || [], "places"),
        reports: getSummaryValue(data.summary || [], "reports"),
        appeals: Number(data.extra?.appeals_new || 0),
        reviews: Number(data.extra?.reviews_total || 0),
        payments: getSummaryValue(data.summary || [], "payments"),
    };
}

export function Sidebar() {
    const { role: userRole } = useAdminAuth();
    const [badges, setBadges] = useState({});

    useEffect(() => {
        let isMounted = true;

        async function loadBadges() {
            try {
                const data = await statisticsApi.getStatistics();

                if (isMounted) {
                    setBadges(buildBadges(data));
                }
            } catch {
                if (isMounted) {
                    setBadges({});
                }
            }
        }

        loadBadges();

        return () => {
            isMounted = false;
        };
    }, []);

    const availableNavigation = useMemo(() => {
        return navigationItems.filter((item) =>
            canAccessByRole(item.roles, userRole)
        );
    }, [userRole]);

    return (
        <aside className="sidebar">
            <div className="brand">
                <span className="brand__mark">NP</span>

                <span>
                    <strong>Native Places</strong>
                    <span>Панель управления</span>
                </span>
            </div>

            <nav className="nav" aria-label="Основная навигация">
                {availableNavigation.map((item) => {
                    const badge = badges[item.id] ?? item.badge;

                    return (
                        <NavLink
                            key={item.id}
                            to={item.path}
                            end={item.end}
                            className={({ isActive }) =>
                                isActive
                                    ? "nav-link nav-link--active"
                                    : "nav-link"
                            }
                        >
                            <span className="nav-link__main">
                                <span
                                    className="nav-link__icon"
                                    aria-hidden="true"
                                >
                                    {item.icon}
                                </span>

                                <span className="nav-link__label">
                                    {item.label}
                                </span>
                            </span>

                            {badge != null && (
                                <span className="nav-link__badge">
                                    {badge}
                                </span>
                            )}
                        </NavLink>
                    );
                })}
            </nav>
        </aside>
    );
}