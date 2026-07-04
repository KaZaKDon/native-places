import { useEffect, useState } from "react";

import { RecentEventsTable } from "./components/RecentEventsTable";
import { StatisticsSummary } from "./components/StatisticsSummary";
import { StatisticsTable } from "./components/StatisticsTable";

import { statisticsApi } from "../../shared/api/statisticsApi";

import "./StatisticsPage.css";

export function StatisticsPage() {
    const [summaryStats, setSummaryStats] = useState([]);
    const [categoryStats, setCategoryStats] = useState([]);
    const [tariffStats, setTariffStats] = useState([]);
    const [paymentStats, setPaymentStats] = useState([]);
    const [recentEvents, setRecentEvents] = useState([]);

    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        let isMounted = true;

        async function loadStatistics() {
            try {
                setIsLoading(true);
                setErrorMessage("");

                const data = await statisticsApi.getStatistics();

                if (isMounted) {
                    setSummaryStats(data.summary || []);
                    setCategoryStats(data.categories || []);
                    setTariffStats(data.tariffs || []);
                    setPaymentStats(data.payments || []);
                    setRecentEvents(data.events || []);
                }
            } catch (error) {
                if (isMounted) {
                    setErrorMessage(error.message || "Не удалось загрузить статистику");
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        loadStatistics();

        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <section className="page statistics-page">
            <div className="page-header">
                <div>
                    <p className="eyebrow">Статистика</p>

                    <h2>Сводка по проекту</h2>

                    <p>
                        Основные показатели Native Places: пользователи, объявления,
                        платежи, тарифы и последние события в системе.
                    </p>
                </div>
            </div>

            {errorMessage ? (
                <div className="statistics-empty">
                    {errorMessage}
                </div>
            ) : null}

            {isLoading ? (
                <div className="statistics-empty">
                    Загружаем статистику...
                </div>
            ) : (
                <>
                    <StatisticsSummary items={summaryStats} />

                    <div className="statistics-grid">
                        <StatisticsTable
                            title="Объявления по категориям"
                            description="Распределение объектов по основным разделам сайта."
                            columns={[
                                { key: "title", label: "Категория" },
                                { key: "count", label: "Количество" },
                            ]}
                            rows={categoryStats}
                        />

                        <StatisticsTable
                            title="Пользователи по тарифам"
                            description="Количество активных подписок по тарифным планам."
                            columns={[
                                { key: "title", label: "Тариф" },
                                { key: "count", label: "Подписок" },
                            ]}
                            rows={tariffStats}
                        />

                        <StatisticsTable
                            title="Платежи"
                            description="Суммы оплаченных платежей по периодам."
                            columns={[
                                { key: "period", label: "Период" },
                                { key: "amount", label: "Сумма" },
                            ]}
                            rows={paymentStats}
                        />

                        <RecentEventsTable events={recentEvents} />
                    </div>
                </>
            )}
        </section>
    );
}