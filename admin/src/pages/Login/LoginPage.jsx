import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { EmptyState } from "../../components/EmptyState/EmptyState";
import { useAdminAuth } from "../../context/useAdminAuth";

import "./LoginPage.css";

export function LoginPage() {
    const location = useLocation();

    const {
        isAuthenticated,
        isLoading: isAuthLoading,
        loginAdmin,
        loginCode,
    } = useAdminAuth();

    const [adminForm, setAdminForm] = useState({
        email: "",
        password: "",
    });
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const [accessCode, setAccessCode] = useState("");

    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const redirectTo = location.state?.from?.pathname || "/";

    if (isAuthLoading) {
        return (
            <section className="login-page">
                <EmptyState>
                    Проверяем доступ к админке...
                </EmptyState>
            </section>
        );
    }

    if (isAuthenticated) {
        return <Navigate to={redirectTo} replace />;
    }

    async function handleAdminSubmit(event) {
        event.preventDefault();

        try {
            setIsLoading(true);
            setErrorMessage("");

            await loginAdmin(
                adminForm.email,
                adminForm.password
            );
        } catch (error) {
            setErrorMessage(
                error.message || "Не удалось выполнить вход"
            );
        } finally {
            setIsLoading(false);
        }
    }

    async function handleCodeSubmit(event) {
        event.preventDefault();

        try {
            setIsLoading(true);
            setErrorMessage("");

            await loginCode(accessCode);
        } catch (error) {
            setErrorMessage(
                error.message || "Не удалось выполнить вход"
            );
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <section className="login-page">
            <div className="login-layout">
                <div className="login-card">
                    <div className="login-card__header">
                        <p className="eyebrow">
                            Native Places Admin
                        </p>

                        <h1>Вход администратора</h1>

                        <p>
                            Войдите по email и паролю.
                        </p>
                    </div>

                    <form
                        className="login-form"
                        onSubmit={handleAdminSubmit}
                    >
                        <label className="login-field">
                            <span>Email</span>

                            <input
                                type="email"
                                value={adminForm.email}
                                onChange={(event) =>
                                    setAdminForm((current) => ({
                                        ...current,
                                        email: event.target.value,
                                    }))
                                }
                                required
                            />
                        </label>

                        <div className="login-field">
                            <label htmlFor="admin-password">Пароль</label>

                            <div className="login-password-field">
                                <input
                                    id="admin-password"
                                    type={isPasswordVisible ? "text" : "password"}
                                    value={adminForm.password}
                                    autoComplete="current-password"
                                    onChange={(event) =>
                                        setAdminForm((current) => ({
                                            ...current,
                                            password: event.target.value,
                                        }))
                                    }
                                    required
                                />

                                <button
                                    className="login-password-toggle"
                                    type="button"
                                    aria-pressed={isPasswordVisible}
                                    onClick={() =>
                                        setIsPasswordVisible((current) => !current)
                                    }
                                >
                                    {isPasswordVisible ? "Скрыть" : "Показать"}
                                </button>
                            </div>
                        </div>

                        <a className="login-forgot-link" href="/auth?mode=forgot">
                            Забыли пароль?
                        </a>

                        <button
                            className="login-submit"
                            type="submit"
                            disabled={isLoading}
                        >
                            Войти как администратор
                        </button>
                    </form>
                </div>

                <div className="login-card">
                    <div className="login-card__header">
                        <p className="eyebrow">
                            Модерация
                        </p>

                        <h2>Вход по коду</h2>

                        <p>
                            Для модераторов проекта.
                        </p>
                    </div>

                    <form
                        className="login-form"
                        onSubmit={handleCodeSubmit}
                    >
                        <label className="login-field">
                            <span>Код доступа</span>

                            <input
                                type="text"
                                value={accessCode}
                                onChange={(event) =>
                                    setAccessCode(
                                        event.target.value
                                    )
                                }
                                required
                            />
                        </label>

                        <button
                            className="login-submit"
                            type="submit"
                            disabled={isLoading}
                        >
                            Войти как модератор
                        </button>
                    </form>
                </div>
            </div>

            {errorMessage ? (
                <div className="login-error">
                    {errorMessage}
                </div>
            ) : null}
        </section>
    );
}
