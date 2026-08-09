import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { authApi } from "../shared/api/authApi";
import { Seo } from "../shared/seo/Seo";

import "./VerifyEmailPage.css";

export function VerifyEmailPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") || "";

    const [isLoading, setIsLoading] = useState(Boolean(token));
    const [message, setMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState(token ? "" : "Не передан токен подтверждения email.");

    useEffect(() => {
        if (!token) {
            return;
        }

        let isMounted = true;

        async function verifyEmail() {
            try {
                setIsLoading(true);
                setErrorMessage("");

                const data = await authApi.verifyEmail(token);

                if (isMounted) {
                    setMessage(data.message || "Email успешно подтверждён. Теперь можно войти.");
                }
            } catch (error) {
                if (isMounted) {
                    setErrorMessage(error.message || "Не удалось подтвердить email.");
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        verifyEmail();

        return () => {
            isMounted = false;
        };
    }, [token]);

    return (
        <>
            <Seo
                title="Подтверждение email | Native Places"
                description="Страница подтверждения email для аккаунта Native Places."
                canonical="https://native-places.ru/verify-email"
                robots="noindex, nofollow"
            />
        <main className="verify-email-page">
            <section className="verify-email-card" aria-live="polite">
                <p className="verify-email-card__eyebrow">Native Places</p>

                <h1>
                    {isLoading
                        ? "Подтверждаем email"
                        : errorMessage
                            ? "Не удалось подтвердить email"
                            : "Почта подтверждена"}
                </h1>

                {isLoading ? (
                    <p>Проверяем ссылку подтверждения. Это займёт несколько секунд.</p>
                ) : errorMessage ? (
                    <p className="verify-email-card__error">{errorMessage}</p>
                ) : (
                    <p className="verify-email-card__success">
                        {message || "Email успешно подтверждён. Добро пожаловать!"}
                    </p>
                )}

                <div className="verify-email-card__actions">
                    <Link to="/auth">Перейти ко входу</Link>
                    <Link to="/">На главную</Link>
                </div>
            </section>
        </main>
        </>
    );
}