import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";

import { BackButton } from "../../components/BackButton/BackButton";
import { NotFoundState } from "../../components/NotFoundState/NotFoundState";
import { StatusBadge } from "../../components/StatusBadge/StatusBadge";

import { paymentsApi } from "../../shared/api/paymentsApi";

import "./PaymentPage.css";

export function PaymentPage() {
    const { paymentId } = useParams();

    const [payment, setPayment] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        let isMounted = true;

        async function fetchPayment() {
            try {
                setIsLoading(true);
                setErrorMessage("");

                const data = await paymentsApi.getPayment(paymentId);

                if (isMounted) {
                    setPayment(data);
                }
            } catch (error) {
                if (isMounted) {
                    setErrorMessage(error.message || "Не удалось загрузить платёж");
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        fetchPayment();

        return () => {
            isMounted = false;
        };
    }, [paymentId]);

    if (isLoading) {
        return (
            <section className="page">
                <BackButton />

                <div className="payment-section">
                    Загружаем платёж...
                </div>
            </section>
        );
    }

    if (errorMessage || !payment) {
        return (
            <NotFoundState
                eyebrow={`Платёж #${paymentId}`}
                title="Платёж не найден"
                description={errorMessage || "Платёж отсутствует или был удалён."}
            />
        );
    }

    return (
        <section className="page">
            <BackButton />

            <div className="page-header">
                <div>
                    <p className="eyebrow">Платёж #{payment.id}</p>

                    <h2>{payment.amount.toLocaleString("ru-RU")} ₽</h2>

                    <p>
                        Тариф «{payment.planTitle}» для пользователя{" "}
                        {payment.userName}.
                    </p>
                </div>

                <StatusBadge status={payment.status} />
            </div>

            <div className="payment-page-grid">
                <div className="payment-page-main">
                    <article className="payment-section">
                        <h3>Связанные данные</h3>

                        <div className="payment-links">
                            {payment.userId ? (
                                <Link to={`/users/view/${payment.userId}`}>
                                    Пользователь: {payment.userName}
                                </Link>
                            ) : null}
                        </div>
                    </article>

                    <article className="payment-section">
                        <h3>Комментарий</h3>

                        <p>
                            Здесь будет информация о ручной оплате, квитанции,
                            назначении платежа или ответ платёжной системы после
                            подключения онлайн-оплаты.
                        </p>
                    </article>
                </div>

                <aside className="payment-page-aside">
                    <article className="payment-section">
                        <h3>Информация</h3>

                        <div className="payment-info-list">
                            <div>
                                <span>ID</span>
                                <strong>#{payment.id}</strong>
                            </div>

                            <div>
                                <span>Тариф</span>
                                <strong>{payment.planTitle}</strong>
                            </div>

                            <div>
                                <span>Сумма</span>
                                <strong>
                                    {payment.amount.toLocaleString("ru-RU")} ₽
                                </strong>
                            </div>

                            <div>
                                <span>Статус</span>
                                <strong>{payment.status}</strong>
                            </div>

                            <div>
                                <span>Источник подписки</span>
                                <strong>{payment.subscriptionSource || "—"}</strong>
                            </div>

                            <div>
                                <span>Создан</span>
                                <strong>{payment.createdAt || "—"}</strong>
                            </div>

                            <div>
                                <span>Оплачен</span>
                                <strong>{payment.paidAt || "—"}</strong>
                            </div>
                        </div>
                    </article>
                </aside>
            </div>
        </section>
    );
}