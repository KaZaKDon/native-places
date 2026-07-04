import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import { BackButton } from "../../components/BackButton/BackButton";
import { NotFoundState } from "../../components/NotFoundState/NotFoundState";
import { StatusBadge } from "../../components/StatusBadge/StatusBadge";

import { reportsApi } from "../../shared/api/reportsApi";

import "./ReportPage.css";

function getUserName(report) {
    return [report.user_first_name, report.user_last_name]
        .filter(Boolean)
        .join(" ") || report.user_email || "—";
}

function createInfo(report) {
    return [
        {
            label: "ID",
            value: `#${report.id}`,
        },
        {
            label: "Тип",
            value: report.report_type || "—",
        },
        {
            label: "Дата",
            value: report.created_at || "—",
        },
        {
            label: "Решена",
            value: report.resolved_at || "—",
        },
        {
            label: "Пользователь",
            value: getUserName(report),
        },
    ];
}

export function ReportPage() {
    const { reportId } = useParams();
    const navigate = useNavigate();

    const [report, setReport] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        let isMounted = true;

        async function loadReport() {
            try {
                setIsLoading(true);
                setErrorMessage("");

                const data = await reportsApi.getReport(reportId);

                if (isMounted) {
                    setReport(data.report || null);
                }
            } catch (error) {
                if (isMounted) {
                    setErrorMessage(error.message || "Не удалось загрузить жалобу");
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        loadReport();

        return () => {
            isMounted = false;
        };
    }, [reportId]);

    const info = useMemo(() => {
        if (!report) {
            return [];
        }

        return createInfo(report);
    }, [report]);

    async function handleResolve() {
        try {
            setIsActionLoading(true);
            setErrorMessage("");

            await reportsApi.closeReport(report.id);

            navigate("/reports/resolved");
        } catch (error) {
            setErrorMessage(error.message || "Не удалось закрыть жалобу");
        } finally {
            setIsActionLoading(false);
        }
    }

    if (isLoading) {
        return (
            <section className="page">
                <BackButton />

                <div className="report-section">
                    Загружаем жалобу...
                </div>
            </section>
        );
    }

    if (errorMessage && !report) {
        return (
            <NotFoundState
                eyebrow={`Жалоба #${reportId}`}
                title="Жалоба не найдена"
                description={errorMessage}
            />
        );
    }

    if (!report) {
        return (
            <NotFoundState
                eyebrow={`Жалоба #${reportId}`}
                title="Жалоба не найдена"
                description="Жалоба отсутствует или была удалена."
            />
        );
    }

    return (
        <section className="page">
            <BackButton />

            <div className="page-header">
                <div>
                    <p className="eyebrow">Жалоба #{report.id}</p>

                    <h2>{report.place_title || "Жалоба на объект"}</h2>

                    <p>Тип жалобы: {report.report_type || "—"}</p>
                </div>

                <StatusBadge status={report.status} />
            </div>

            {errorMessage ? (
                <div className="report-section">
                    {errorMessage}
                </div>
            ) : null}

            <div className="report-page-grid">
                <div className="report-page-main">
                    <article className="report-section">
                        <h3>Описание жалобы</h3>

                        <p>{report.message || "Описание жалобы не заполнено."}</p>
                    </article>

                    <article className="report-section">
                        <h3>Связанные данные</h3>

                        <div className="report-links">
                            {report.place_id ? (
                                <Link to={`/places/view/${report.place_id}`}>
                                    Открыть объявление: {report.place_title || `#${report.place_id}`}
                                </Link>
                            ) : null}

                            {report.user_id ? (
                                <Link to={`/users/view/${report.user_id}`}>
                                    Открыть пользователя: {getUserName(report)}
                                </Link>
                            ) : null}
                        </div>
                    </article>
                </div>

                <aside className="report-page-aside">
                    <article className="report-section">
                        <h3>Информация</h3>

                        <div className="report-info-list">
                            {info.map((item) => (
                                <div key={item.label}>
                                    <span>{item.label}</span>
                                    <strong>{item.value}</strong>
                                </div>
                            ))}
                        </div>
                    </article>

                    <article className="report-section">
                        <h3>Решение модератора</h3>

                        <div className="report-actions">
                            <button
                                type="button"
                                onClick={handleResolve}
                                disabled={isActionLoading || report.status === "resolved"}
                            >
                                {report.status === "resolved" ? "Жалоба закрыта" : "Закрыть жалобу"}
                            </button>
                        </div>
                    </article>
                </aside>
            </div>
        </section>
    );
}