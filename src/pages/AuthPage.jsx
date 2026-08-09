import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { authApi } from "../shared/api/authApi";
import { EyeIcon } from "../shared/icons/EyeIcon";
import { EyeOffIcon } from "../shared/icons/EyeOffIcon";
import { useAuth } from "../shared/auth/useAuth";
import { Seo } from "../shared/seo/Seo";

import "./AuthPage.css";

const initialForm = {
    firstName: "",
    email: "",
    password: "",
    passwordConfirm: "",
    resetToken: "",
    acceptedTerms: false,
    acceptedPersonalData: false,
    acceptedMarketing: false,
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
    const [verificationNotice, setVerificationNotice] = useState(null);

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
        const { checked, name, type, value } = event.target;

        setForm((currentForm) => ({
            ...currentForm,
            [name]: type === "checkbox" ? checked : value,
        }));
    }

    function handleModeChange(nextMode) {
        setMode(nextMode);
        setErrorMessage("");
        setStatusMessage("");
        setVerificationNotice(null);
        setShowPassword(false);
    }

    async function handleResendVerification() {
        if (!verificationNotice?.email) {
            return;
        }

        setIsSubmitting(true);
        setErrorMessage("");
        setStatusMessage("");

        try {
            const data = await authApi.resendVerification(verificationNotice.email);

            setVerificationNotice((currentNotice) => ({
                ...currentNotice,
                expiresAt: data.verification_expires_at || currentNotice?.expiresAt || "",
            }));
            setStatusMessage(data.message || "Письмо подтверждения отправлено повторно.");
        } catch (error) {
            setErrorMessage(error.message || "Не удалось отправить письмо повторно");
        } finally {
            setIsSubmitting(false);
        }
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

            if (isRegisterMode) {
                if (form.password !== form.passwordConfirm) {
                    setErrorMessage("Пароли не совпадают.");
                    return;
                }

                if (!form.acceptedTerms) {
                    setErrorMessage("Подтвердите согласие с правилами сайта.");
                    return;
                }

                if (!form.acceptedPersonalData) {
                    setErrorMessage("Подтвердите согласие на обработку персональных данных.");
                    return;
                }
            }

            if (isLoginMode) {
                await login({
                    email: form.email,
                    password: form.password,
                });
            } else {
                const registerData = await register({
                    firstName: form.firstName,
                    email: form.email,
                    password: form.password,
                    acceptedTerms: form.acceptedTerms,
                    acceptedPersonalData: form.acceptedPersonalData,
                    acceptedMarketing: form.acceptedMarketing,
                });

                if (registerData?.requires_email_verification) {
                    setVerificationNotice({
                        email: registerData.email || form.email,
                        expiresAt: registerData.verification_expires_at || "",
                    });
                    setForm({
                        ...initialForm,
                        email: registerData.email || form.email,
                    });
                    setShowPassword(false);
                    setStatusMessage(registerData.message || "Проверьте почту и подтвердите email.");
                    return;
                }
            }

            setForm(initialForm);
            setShowPassword(false);
            navigate("/account");
        } catch (error) {
            if (isLoginMode && error.extra?.code === "email_not_verified") {
                setVerificationNotice({
                    email: error.extra.email || form.email,
                    expiresAt: error.extra.verification_expires_at || "",
                });
                setStatusMessage(
                    error.message ||
                    "Подтвердите email перед входом. Если письма нет, отправьте его повторно."
                );
                return;
            }
            
            setErrorMessage(error.message || "Не удалось выполнить действие");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <>
            <Seo
                title={`${title} | Native Places`}
                description="Вход, регистрация и восстановление доступа к аккаунту Native Places."
                canonical="https://native-places.ru/auth"
                robots="noindex, nofollow"
            />
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

                {verificationNotice ? (
                    <div className="auth-verification-notice">
                        <h2>Проверьте почту</h2>

                        <p>
                            Мы отправили письмо подтверждения на <strong>{verificationNotice.email}</strong>.
                            Перейдите по ссылке из письма, чтобы завершить регистрацию.
                        </p>

                        {verificationNotice.expiresAt ? (
                            <p className="auth-verification-notice__meta">
                                Ссылка действует до: {verificationNotice.expiresAt}
                            </p>
                        ) : null}

                        {statusMessage && (
                            <p className="auth-form__success" role="status">
                                {statusMessage}
                            </p>
                        )}

                        {errorMessage && (
                            <p className="auth-form__error" role="alert">
                                {errorMessage}
                            </p>
                        )}

                        <div className="auth-verification-notice__actions">
                            <button
                                className="auth-form__submit"
                                type="button"
                                onClick={handleResendVerification}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Отправляем..." : "Отправить письмо повторно"}
                            </button>

                            <button
                                className="auth-form__link"
                                type="button"
                                onClick={() => handleModeChange("login")}
                            >
                                Перейти ко входу
                            </button>
                        </div>
                    </div>
                ) : (
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

                        {(isRegisterMode || isResetMode) && (
                            <label className="auth-form__field">
                                <span>
                                    {isResetMode
                                        ? "Повторите пароль"
                                        : "Повторите пароль для регистрации"}
                                </span>
                                <input
                                    name="passwordConfirm"
                                    type={showPassword ? "text" : "password"}
                                    value={form.passwordConfirm}
                                    onChange={handleChange}
                                    placeholder={
                                        isResetMode
                                            ? "Повторите новый пароль"
                                            : "Повторите пароль"
                                    }
                                    autoComplete="new-password"
                                    required
                                    minLength={6}
                                />
                            </label>
                        )}

                        {isRegisterMode && (
                            <div className="auth-form__checkboxes">
                                <label className="auth-form__checkbox">
                                    <input
                                        name="acceptedTerms"
                                        type="checkbox"
                                        checked={form.acceptedTerms}
                                        onChange={handleChange}
                                        required
                                    />

                                    <span>
                                        Я принимаю{" "}
                                        <Link to="/rules" state={{ from: "/auth" }}>
                                            правила сайта
                                        </Link>{" "}
                                        и{" "}
                                        <Link to="/user-agreement" state={{ from: "/auth" }}>
                                            пользовательское соглашение
                                        </Link>
                                        .
                                    </span>
                                </label>

                                <label className="auth-form__checkbox">
                                    <input
                                        name="acceptedPersonalData"
                                        type="checkbox"
                                        checked={form.acceptedPersonalData}
                                        onChange={handleChange}
                                        required
                                    />

                                    <span>
                                        Я даю согласие на обработку персональных данных и ознакомлен с{" "}
                                        <Link to="/privacy-policy" state={{ from: "/auth" }}>
                                            политикой конфиденциальности
                                        </Link>
                                        .
                                    </span>
                                </label>

                                <label className="auth-form__checkbox">
                                    <input
                                        name="acceptedMarketing"
                                        type="checkbox"
                                        checked={form.acceptedMarketing}
                                        onChange={handleChange}
                                    />

                                    <span>
                                        Я согласен получать новости и информационные письма Native Places.
                                    </span>
                                </label>
                            </div>
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
                )}
                <nav className="auth-card__legal-links" aria-label="Документы сайта">
                    <Link to="/rules" state={{ from: "/auth" }}>
                        Правила
                    </Link>
                    <Link to="/user-agreement" state={{ from: "/auth" }}>
                        Соглашение
                    </Link>
                    <Link to="/privacy-policy" state={{ from: "/auth" }}>
                        Конфиденциальность
                    </Link>
                </nav>
            </section>
        </main>
        </>
    );
}