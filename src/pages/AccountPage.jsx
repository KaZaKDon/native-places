import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../shared/auth/useAuth";

import { AccountBook } from "../widgets/account-book";

import "./AccountPage.css";

export function AccountPage() {
    const navigate = useNavigate();
    const { isAuth, authLoading, logout } = useAuth();

    useEffect(() => {
        if (!authLoading && !isAuth) {
            navigate("/auth", { replace: true });
        }
    }, [authLoading, isAuth, navigate]);

    async function handleLogout(event) {
        event.preventDefault();

        try {
            await logout();
        } finally {
            navigate("/");
        }
    }

    if (authLoading) {
        return (
            <main className="account-page">
                <section className="account-page__hero">
                    <p className="account-page__loading">Проверяем вход...</p>
                </section>
            </main>
        );
    }

    if (!isAuth) {
        return null;
    }

    return (
        <main className="account-page">
            <section className="account-page__hero">
                <Link className="account-page__back" to="/">
                    ← На главную
                </Link>

                <a
                    className="account-page__logout"
                    href="/"
                    onClick={handleLogout}
                >
                    Выйти →
                </a>

                <AccountBook />
            </section>
        </main>
    );
}