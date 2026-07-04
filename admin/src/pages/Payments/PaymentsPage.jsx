import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { PaymentsStatusTabs } from "./components/PaymentsStatusTabs";
import { PaymentsTable } from "./components/PaymentsTable";

import { paymentsApi } from "../../shared/api/paymentsApi";

import "./PaymentsPage.css";

export function PaymentsPage() {
  const { status } = useParams();

  const currentStatus = status || "all";

  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function fetchPayments() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const data = await paymentsApi.getPayments(currentStatus);

        if (isMounted) {
          setPayments(data.payments);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.message || "Не удалось загрузить платежи");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchPayments();

    return () => {
      isMounted = false;
    };
  }, [currentStatus]);

  const statusItems = useMemo(() => {
    const paidCount = payments.filter(
      (item) => item.status === "paid"
    ).length;

    const waitingCount = payments.filter(
      (item) =>
        item.status === "pending" ||
        item.status === "waiting"
    ).length;

    const failedCount = payments.filter(
      (item) =>
        item.status === "failed" ||
        item.status === "rejected"
    ).length;

    return [
      {
        value: "all",
        label: "Все",
        count: payments.length,
      },
      {
        value: "paid",
        label: "Оплачено",
        count: paidCount,
      },
      {
        value: "pending",
        label: "Ожидают",
        count: waitingCount,
      },
      {
        value: "failed",
        label: "Ошибка",
        count: failedCount,
      },
    ];
  }, [payments]);

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Платежи</p>

          <h2>Платежи и заявки на оплату</h2>

          <p>
            Здесь администратор видит оплату тарифов,
            подтверждение ручных платежей и историю оплат.
          </p>
        </div>
      </div>

      <PaymentsStatusTabs items={statusItems} />

      {isLoading ? (
        <p>Загрузка...</p>
      ) : errorMessage ? (
        <p>{errorMessage}</p>
      ) : (
        <PaymentsTable payments={payments} />
      )}
    </section>
  );
}