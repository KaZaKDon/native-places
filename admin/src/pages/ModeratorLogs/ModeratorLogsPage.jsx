import { useEffect, useMemo, useState } from "react";

import { ModeratorLogsFilters } from "./components/ModeratorLogsFilters";
import { ModeratorLogsSummary } from "./components/ModeratorLogsSummary";
import { ModeratorLogsTable } from "./components/ModeratorLogsTable";

import { moderatorLogsApi } from "../../shared/api/moderatorLogsApi";

import "./ModeratorLogsPage.css";

const sectionFilterItems = [
    { value: "all", title: "Все разделы" },
    { value: "place", title: "Объявления" },
    { value: "review", title: "Отзывы" },
    { value: "report", title: "Жалобы" },
    { value: "user", title: "Пользователи" },
];

const actionFilterItems = [
    { value: "all", title: "Все действия" },
    { value: "publish", title: "Публикация" },
    { value: "reject", title: "Отклонение" },
    { value: "archive", title: "Архивирование" },
    { value: "close", title: "Закрытие" },
    { value: "update_role", title: "Изменение роли" },
    { value: "update_status", title: "Изменение статуса" },
    { value: "generate_moderator_code", title: "Код доступа модератора" },
];

const periodFilterItems = [
    { value: "all", title: "Все время" },
    { value: "today", title: "Сегодня" },
    { value: "week", title: "7 дней" },
    { value: "month", title: "30 дней" },
];

const sectionLabels = {
    place: "Объявления",
    review: "Отзывы",
    report: "Жалобы",
    user: "Пользователи",
};

const actionLabels = {
    publish: "Публикация",
    reject: "Отклонение",
    archive: "Архивирование",
    close: "Закрытие",
    update_role: "Изменение роли",
    update_status: "Изменение статуса",
    generate_moderator_code: "Код доступа модератора",
};

function getModeratorName(log) {
    return [log.moderator_first_name, log.moderator_last_name]
        .filter(Boolean)
        .join(" ") || log.moderator_email || `Сотрудник #${log.moderator_id}`;
}

function getStaffName(user) {
    return [user.first_name, user.last_name].filter(Boolean).join(" ")
        || user.email
        || `Сотрудник #${user.id}`;
}

function buildStaffFilterItems(staff) {
    return [
        { value: "all", title: "Все сотрудники" },
        ...staff.map((user) => ({
            value: String(user.id),
            title: getStaffName(user),
        })),
    ];
}

function getPeriodCode(createdAt) {
    if (!createdAt) {
        return "all";
    }

    const createdDate = new Date(createdAt.replace(" ", "T"));
    const now = new Date();

    if (Number.isNaN(createdDate.getTime())) {
        return "all";
    }

    const diffMs = now.getTime() - createdDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    const sameDate = createdDate.toDateString() === now.toDateString();

    if (sameDate) {
        return "today";
    }

    if (diffDays <= 7) {
        return "week";
    }

    if (diffDays <= 30) {
        return "month";
    }

    return "all";
}

function isLogInPeriod(log, period) {
    if (period === "all") {
        return true;
    }

    if (period === "today") {
        return log.period === "today";
    }

    if (period === "week") {
        return log.period === "today" || log.period === "week";
    }

    if (period === "month") {
        return log.period === "today" || log.period === "week" || log.period === "month";
    }

    return true;
}

function mapLogFromApi(log) {
    return {
        ...log,
        id: Number(log.id),
        moderatorId: String(log.moderator_id),
        moderatorName: getModeratorName(log),
        actionCode: log.action_type,
        actionTitle: actionLabels[log.action_type] || log.action_type,
        sectionCode: log.entity_type,
        sectionTitle: sectionLabels[log.entity_type] || log.entity_type,
        targetTitle: log.description || `${log.entity_type} #${log.entity_id}`,
        createdAt: log.created_at || "—",
        period: getPeriodCode(log.created_at),
    };
}

export function ModeratorLogsPage() {
    const [logs, setLogs] = useState([]);
    const [staff, setStaff] = useState([]);

    const [filters, setFilters] = useState({
        moderator: "all",
        section: "all",
        action: "all",
        period: "all",
    });

    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        let isMounted = true;

        async function loadLogs() {
            try {
                setIsLoading(true);
                setErrorMessage("");

                const data = await moderatorLogsApi.getLogs();

                if (isMounted) {
                    setLogs((data.logs || []).map(mapLogFromApi));
                    setStaff(data.staff || []);
                }
            } catch (error) {
                if (isMounted) {
                    setErrorMessage(error.message || "Не удалось загрузить логи модераторов");
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        loadLogs();

        return () => {
            isMounted = false;
        };
    }, []);

    const moderatorFilterItems = useMemo(() => (
        buildStaffFilterItems(staff)
    ), [staff]);

    const filteredLogs = useMemo(() => (
        logs.filter((log) => {
            const moderatorMatch = (
                filters.moderator === "all" || log.moderatorId === filters.moderator
            );

            const sectionMatch = (
                filters.section === "all" || log.sectionCode === filters.section
            );

            const actionMatch = (
                filters.action === "all" || log.actionCode === filters.action
            );

            const periodMatch = isLogInPeriod(log, filters.period);

            return moderatorMatch && sectionMatch && actionMatch && periodMatch;
        })
    ), [filters, logs]);

    const summary = useMemo(() => ({
        total: filteredLogs.length,
        today: filteredLogs.filter((log) => log.period === "today").length,
        places: filteredLogs.filter((log) => log.sectionCode === "place").length,
        reportsAndReviews: filteredLogs.filter((log) => (
            log.sectionCode === "report" || log.sectionCode === "review"
        )).length,
    }), [filteredLogs]);

    function handleFilterChange(field, value) {
        setFilters((currentFilters) => ({
            ...currentFilters,
            [field]: value,
        }));
    }

    function resetFilters() {
        setFilters({
            moderator: "all",
            section: "all",
            action: "all",
            period: "all",
        });
    }

    return (
        <section className="page moderator-logs-page">
            <div className="page-header">
                <div>
                    <p className="eyebrow">Логи модераторов</p>

                    <h2>Журнал действий модерации</h2>

                    <p>
                        История действий администраторов и модераторов: публикации,
                        отклонения, жалобы, отзывы и пользователи.
                    </p>
                </div>
            </div>

            {errorMessage ? (
                <div className="moderator-logs-empty">
                    {errorMessage}
                </div>
            ) : null}

            <ModeratorLogsFilters
                filters={filters}
                moderators={moderatorFilterItems}
                sections={sectionFilterItems}
                actions={actionFilterItems}
                periods={periodFilterItems}
                onChange={handleFilterChange}
                onReset={resetFilters}
            />

            <ModeratorLogsSummary summary={summary} />

            {isLoading ? (
                <div className="moderator-logs-empty">
                    Загружаем логи...
                </div>
            ) : (
                <ModeratorLogsTable logs={filteredLogs} />
            )}
        </section>
    );
}