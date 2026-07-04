import { Navigate, useLocation } from "react-router-dom";

import { EmptyState } from "../EmptyState/EmptyState";
import { useAdminAuth } from "../../context/useAdminAuth";

export function RequireAuth({ children }) {
    const location = useLocation();

    const {
        isAuthenticated,
        isLoading,
    } = useAdminAuth();

    if (isLoading) {
        return (
            <section className="page">
                <EmptyState>
                    Проверяем доступ к админке...
                </EmptyState>
            </section>
        );
    }

    if (!isAuthenticated) {
        return (
            <Navigate
                to="/login"
                replace
                state={{
                    from: location,
                }}
            />
        );
    }

    return children;
}