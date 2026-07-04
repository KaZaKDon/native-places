import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { ReportsStatusTabs } from "./components/ReportsStatusTabs";
import { ReportsTable } from "./components/ReportsTable";

import { reportsApi } from "../../shared/api/reportsApi";

import "./ReportsPage.css";

const STATUS_LABELS = {
    all: "Все",
    new: "Новые",
    in_progress: "В работе",
    resolved: "Решённые",
    rejected: "Отклонённые",
};

const STATUS_VALUES = ["all", "new", "in_progress", "resolved", "rejected"];

function mapReportFromApi(report) {
    const userName = [report.user_first_name, report.user_last_name]
        .filter(Boolean)
        .join(" ");

    return {
        ...report,
        title: report.place_title || "Жалоба",
        type: report.report_type || "—",
        placeTitle: report.place_title || "—",
        userName: userName || report.user_email || "—",
        createdAt: report.created_at || "—",
    };
}

export function ReportsPage() {
    const { status } = useParams();

    const currentStatus = status || "all";

    const [reports, setReports] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        let isMounted = true;

        async function loadReports() {
            try {
                setIsLoading(true);
                setErrorMessage("");

                const data = await reportsApi.getReports({
                    status: currentStatus,
                });

                const mappedReports = (data.reports || []).map(mapReportFromApi);

                if (isMounted) {
                    setReports(mappedReports);
                }
            } catch (error) {
                if (isMounted) {
                    setErrorMessage(error.message || "Не удалось загрузить жалобы");
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        loadReports();

        return () => {
            isMounted = false;
        };
    }, [currentStatus]);

    const statusItems = useMemo(() => {
        return STATUS_VALUES.map((itemStatus) => ({
            value: itemStatus,
            label: STATUS_LABELS[itemStatus],
            count: itemStatus === currentStatus ? reports.length : 0,
        }));
    }, [currentStatus, reports.length]);

    return (
        <section className="page">
            <div className="page-header">
                <div>
                    <p className="eyebrow">Жалобы</p>

                    <h2>Обработка жалоб</h2>

                    <p>
                        Реальные жалобы пользователей на объявления.
                    </p>
                </div>
            </div>

            {errorMessage ? (
                <div className="reports-empty">
                    {errorMessage}
                </div>
            ) : null}

            <ReportsStatusTabs items={statusItems} />

            {isLoading ? (
                <div className="reports-empty">
                    Загружаем жалобы...
                </div>
            ) : (
                <ReportsTable reports={reports} />
            )}
        </section>
    );
}