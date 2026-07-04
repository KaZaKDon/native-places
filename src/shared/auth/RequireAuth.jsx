import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "./useAuth";

import "./RequireAuth.css";

export function RequireAuth({ children }) {
    const location = useLocation();
    const { isAuth, authLoading } = useAuth();

    if (authLoading) {
        return (
            <main className="auth-guard">
                <p className="auth-guard__text">Проверяем вход...</p>
            </main>
        );
    }

    if (!isAuth) {
        return (
            <Navigate
                to="/auth"
                replace
                state={{
                    from: location.pathname,
                }}
            />
        );
    }

    return children;
}