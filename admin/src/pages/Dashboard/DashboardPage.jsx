import { useEffect, useMemo, useState } from "react";

import { DashboardStats } from "../../components/DashboardStats/DashboardStats";
import { DashboardPanel } from "../../components/DashboardPanel/DashboardPanel";
import { DashboardList } from "../../components/DashboardList/DashboardList";

import { dashboardApi } from "../../shared/api/dashboardApi";

import "./DashboardPage.css";

const EMPTY_DASHBOARD = {
    users_count: 0,
    active_users_count: 0,
    places_count: 0,
    published_places_count: 0,
    pending_places_count: 0,
    rejected_places_count: 0,
    archived_places_count: 0,
    new_reports_count: 0,
    closed_reports_count: 0,
    pending_reviews_count: 0,
    published_reviews_count: 0,
    active_access_codes_count: 0,
};

export function DashboardPage() {
    const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        let isMounted = true;

        async function loadDashboard() {
            try {
                setIsLoading(true);
                setErrorMessage("");

                const data = await dashboardApi.getDashboard();

                if (isMounted) {
                    setDashboard(data.dashboard || EMPTY_DASHBOARD);
                }
            } catch (error) {
                if (isMounted) {
                    setErrorMessage(error.message || "Не удалось загрузить данные панели");
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        loadDashboard();

        return () => {
            isMounted = false;
        };
    }, []);

    const stats = useMemo(() => {
        return [
            {
                title: "На модерации",
                value: dashboard.pending_places_count,
                text: "Объявлений ожидают проверки",
                to: "/places/pending",
            },
            {
                title: "Пользователи",
                value: dashboard.users_count,
                text: `Активных пользователей: ${dashboard.active_users_count}`,
                to: "/users",
            },
            {
                title: "Жалобы",
                value: dashboard.new_reports_count,
                text: "Новых жалоб требуют внимания",
                to: "/reports/new",
            },
            {
                title: "Отзывы",
                value: dashboard.pending_reviews_count,
                text: "Отзывов ожидают модерации",
                to: "/reviews/pending",
            },
        ];
    }, [dashboard]);

    const moderationQueue = useMemo(() => {
        return [
            {
                id: "pending_places",
                title: "Объявления на модерации",
                value: dashboard.pending_places_count,
                to: "/places/pending",
            },
            {
                id: "pending_reviews",
                title: "Отзывы на модерации",
                value: dashboard.pending_reviews_count,
                to: "/reviews/pending",
            },
            {
                id: "new_reports",
                title: "Новые жалобы",
                value: dashboard.new_reports_count,
                to: "/reports/new",
            },
        ].filter((item) => item.value > 0);
    }, [dashboard]);

    const systemSummary = useMemo(() => {
        return [
            {
                id: "published_places",
                title: "Опубликовано объявлений",
                value: dashboard.published_places_count,
            },
            {
                id: "rejected_places",
                title: "Отклонено объявлений",
                value: dashboard.rejected_places_count,
            },
            {
                id: "archived_places",
                title: "В архиве",
                value: dashboard.archived_places_count,
            },
            {
                id: "access_codes",
                title: "Активные коды доступа",
                value: dashboard.active_access_codes_count,
            },
        ];
    }, [dashboard]);

    return (
        <section className="page">
            <div className="page-header">
                <div>
                    <p className="eyebrow">Главная</p>

                    <h2>Панель управления</h2>

                    <p>
                        Сводка по пользователям, объявлениям, жалобам и отзывам.
                    </p>
                </div>
            </div>

            {errorMessage ? (
                <div className="dashboard-message dashboard-message--error">
                    {errorMessage}
                </div>
            ) : null}

            {isLoading ? (
                <div className="dashboard-message">
                    Загружаем данные панели...
                </div>
            ) : (
                <>
                    <DashboardStats items={stats} />

                    <div className="dashboard-columns">
                        <DashboardPanel
                            title="Требует внимания"
                            count={moderationQueue.length}
                        >
                            <DashboardList
                                items={moderationQueue}
                                renderItem={(item) => (
                                    <>
                                        <strong>{item.title}</strong>

                                        <span>{item.value}</span>
                                    </>
                                )}
                            />
                        </DashboardPanel>

                        <DashboardPanel
                            title="Состояние системы"
                            count={systemSummary.length}
                        >
                            <DashboardList
                                items={systemSummary}
                                renderItem={(item) => (
                                    <>
                                        <strong>{item.title}</strong>

                                        <span>{item.value}</span>
                                    </>
                                )}
                            />
                        </DashboardPanel>
                    </div>
                </>
            )}
        </section>
    );
}  