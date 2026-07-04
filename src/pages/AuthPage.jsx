import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { authApi } from "../shared/api/authApi";
import { EyeIcon } from "../shared/icons/EyeIcon";
import { EyeOffIcon } from "../shared/icons/EyeOffIcon";
import { useAuth } from "../shared/auth/useAuth";

import "./AuthPage.css";

const initialForm = {
    firstName: "",
    email: "",
    password: "",
    passwordConfirm: "",
    resetToken: "",
};

function getInitialMode(searchParams) {
    return searchParams.get("reset_token") || searchParams.get("token")
        ? "reset"
        : "login";
}

export function AuthPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { login, register } = useAuth();

    const initialResetToken = searchParams.get("reset_token") ||
        searchParams.get("token") ||
        "";

    const [mode, setMode] = useState(() => getInitialMode(searchParams));
    const [form, setForm] = useState({
        ...initialForm,
        resetToken: initialResetToken,
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [statusMessage, setStatusMessage] = useState("");

    const isLoginMode = mode === "login";
    const isRegisterMode = mode === "register";
    const isForgotMode = mode === "forgot";
    const isResetMode = mode === "reset";

    const title = useMemo(() => {
        if (isForgotMode) {
            return "Восстановление пароля";
        }

        if (isResetMode) {
            return "Новый пароль";
        }

        return isLoginMode ? "Добро пожаловать" : "Создание аккаунта";
    }, [isForgotMode, isLoginMode, isResetMode]);

    const subtitle = useMemo(() => {
        if (isForgotMode) {
            return "Укажите email аккаунта — отправим ссылку для восстановления пароля.";
        }

        if (isResetMode) {
            return "Введите код восстановления из письма и задайте новый пароль.";
        }

        return isLoginMode
            ? "Войдите, чтобы сохранять места, создавать маршруты и публиковать свои объекты."
            : "Создайте аккаунт, чтобы добавлять места, маршруты и пользоваться личным кабинетом.";
    }, [isForgotMode, isLoginMode, isResetMode]);

    function handleChange(event) {
        const { name, value } = event.target;

        setForm((currentForm) => ({
            ...currentForm,
            [name]: value,
        }));
    }

    function handleModeChange(nextMode) {
        setMode(nextMode);
        setErrorMessage("");
        setStatusMessage("");
        setShowPassword(false);
    }

    async function handleSubmit(event) {
        event.preventDefault();

        setIsSubmitting(true);
        setErrorMessage("");
        setStatusMessage("");

        try {
            if (isForgotMode) {
                const result = await authApi.requestPasswordReset({
                    email: form.email,
                });

                setStatusMessage(
                    result.message ||
                    "Если такой email зарегистрирован, мы отправим ссылку для восстановления."
                );
                return;
            }

            if (isResetMode) {
                if (form.password !== form.passwordConfirm) {
                    setErrorMessage("Пароли не совпадают.");
                    return;
                }

                const result = await authApi.resetPassword({
                    token: form.resetToken,
                    password: form.password,
                });

                setForm(initialForm);
                setShowPassword(false);
                setStatusMessage(
                    result.message || "Пароль обновлён. Теперь можно войти."
                );
                setMode("login");
                return;
            }

            if (isLoginMode) {
                await login({
                    email: form.email,
                    password: form.password,
                });
            } else {
                await register({
                    firstName: form.firstName,
                    email: form.email,
                    password: form.password,
                });
            }

            setForm(initialForm);
            setShowPassword(false);
            navigate("/account");
        } catch (error) {
            setErrorMessage(error.message || "Не удалось выполнить действие");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <main className="auth-page">
            <div className="auth-page__map" />
            <div className="auth-page__overlay" />

            <section className="auth-card" aria-label="Авторизация">
                <div className="auth-card__header">
                    <p className="auth-card__eyebrow">Native Places</p>

                    <h1 className="auth-card__title">{title}</h1>

                    <p className="auth-card__subtitle">{subtitle}</p>
                </div>

                <div className="auth-tabs" role="tablist" aria-label="Выбор действия">
                    <button
                        className={
                            isRegisterMode
                                ? "auth-tabs__button auth-tabs__button--active"
                                : "auth-tabs__button"
                        }
                        type="button"
                        onClick={() => handleModeChange("login")}
                    >
                        Вход
                    </button>

                    <button
                        className={
                            !isLoginMode
                                ? "auth-tabs__button auth-tabs__button--active"
                                : "auth-tabs__button"
                        }
                        type="button"
                        onClick={() => handleModeChange("register")}
                    >
                        Регистрация
                    </button>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    {isRegisterMode && (
                        <label className="auth-form__field">
                            <span>Имя</span>
                            <input
                                name="firstName"
                                type="text"
                                value={form.firstName}
                                onChange={handleChange}
                                placeholder="Например, Дмитрий"
                                autoComplete="given-name"
                                required
                            />
                        </label>
                    )}

                    {isResetMode && (
                        <label className="auth-form__field">
                            <span>Код восстановления</span>
                            <input
                                name="resetToken"
                                type="text"
                                value={form.resetToken}
                                onChange={handleChange}
                                placeholder="Код из письма"
                                autoComplete="one-time-code"
                                required
                            />
                        </label>
                    )}

                    {!isResetMode && (
                        <label className="auth-form__field">
                            <span>Email</span>
                            <input
                                name="email"
                                type="email"
                                value={form.email}
                                onChange={handleChange}
                                placeholder="you@example.com"
                                autoComplete="email"
                                required
                            />
                        </label>
                    )}

                    {!isForgotMode && (
                        <label className="auth-form__field">
                            <span>{isResetMode ? "Новый пароль" : "Пароль"}</span>

                            <div className="auth-form__password">
                                <input
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    value={form.password}
                                    onChange={handleChange}
                                    placeholder="Минимум 6 символов"
                                    autoComplete={isLoginMode ? "current-password" : "new-password"}
                                    required
                                    minLength={6}
                                />

                                <button
                                    className="auth-form__password-toggle"
                                    type="button"
                                    onClick={() => setShowPassword((currentValue) => !currentValue)}
                                    aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                                    title={showPassword ? "Скрыть пароль" : "Показать пароль"}
                                >
                                    {showPassword ? (
                                        <EyeOffIcon aria-hidden="true" />
                                    ) : (
                                        <EyeIcon aria-hidden="true" />
                                    )}
                                </button>
                            </div>
                        </label>
                    )}

                    {isResetMode && (
                        <label className="auth-form__field">
                            <span>Повторите пароль</span>
                            <input
                                name="passwordConfirm"
                                type={showPassword ? "text" : "password"}
                                value={form.passwordConfirm}
                                onChange={handleChange}
                                placeholder="Повторите новый пароль"
                                autoComplete="new-password"
                                required
                                minLength={6}
                            />
                        </label>
                    )}

                    {isLoginMode && (
                        <button
                            className="auth-form__link"
                            type="button"
                            onClick={() => handleModeChange("forgot")}
                        >
                            Забыли пароль?
                        </button>
                    )}

                    {(isForgotMode || isResetMode) && (
                        <button
                            className="auth-form__link auth-form__link--back"
                            type="button"
                            onClick={() => handleModeChange("login")}
                        >
                            ← Вернуться ко входу
                        </button>
                    )}

                    {errorMessage && (
                        <p className="auth-form__error" role="alert">
                            {errorMessage}
                        </p>
                    )}

                    {statusMessage && (
                        <p className="auth-form__success" role="status">
                            {statusMessage}
                        </p>
                    )}

                    <button
                        className="auth-form__submit"
                        type="submit"
                        disabled={isSubmitting}
                    >
                        {isSubmitting
                            ? "Подождите..."
                            : isForgotMode
                                ? "Отправить ссылку"
                                : isResetMode
                                    ? "Сохранить пароль"
                                    : isLoginMode
                                        ? "Войти"
                                        : "Создать аккаунт"}
                    </button>
                </form>
            </section>
        </main>
    );
}