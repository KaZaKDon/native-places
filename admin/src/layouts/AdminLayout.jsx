import { useMemo } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { Sidebar } from "../components/Sidebar/Sidebar";
import { Topbar } from "../components/Topbar/Topbar";
import { pageTitles } from "../config/navigation";
import { useAdminAuth } from "../context/useAdminAuth";
import { useTheme } from "../hooks/useTheme";

export function AdminLayout() {
    const location = useLocation();
    const { theme, toggleTheme } = useTheme();
    const { user, logout } = useAdminAuth();

    const pageTitle = useMemo(() => {
        if (location.pathname.startsWith("/places")) {
            return "Объявления";
        }

        if (location.pathname.startsWith("/users")) {
            return "Пользователи";
        }

        if (location.pathname.startsWith("/reports")) {
            return "Жалобы";
        }

        if (location.pathname.startsWith("/reviews")) {
            return "Отзывы";
        }

        if (location.pathname.startsWith("/payments")) {
            return "Платежи";
        }

        return pageTitles[location.pathname] || "Админка";
    }, [location.pathname]);

    return (
        <div className="admin-shell">
            <Sidebar />

            <main className="workspace">
                <Topbar
                    pageTitle={pageTitle}
                    theme={theme}
                    onToggleTheme={toggleTheme}
                    user={user}
                    onLogout={logout}
                />

                <section className="content">
                    <Outlet />
                </section>
            </main>
        </div>
    );
}
