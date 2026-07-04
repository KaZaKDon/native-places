import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { AppealsStatusTabs } from "./components/AppealsStatusTabs";
import { AppealsTable } from "./components/AppealsTable";

import { appealsApi } from "../../shared/api/appealsApi";

import "./AppealsPage.css";

const STATUS_LABELS = {
    all: "Все",
    new: "Новые",
    in_work: "В работе",
    closed: "Рассмотренные",
};

const STATUS_VALUES = ["all", "new", "in_work", "closed"];

function mapAppealFromApi(appeal) {
    const userName = [appeal.user_first_name, appeal.user_last_name]
        .filter(Boolean)
        .join(" ");

    return {
        ...appeal,
        title: appeal.appeal_type === "idea" ? "Предложение" : "Поддержка",
        userName: userName || appeal.user_email || "—",
        createdAt: appeal.created_at || "—",
    };
}

export function AppealsPage() {
    const { status } = useParams();

    const currentStatus = status || "all";

    const [allAppeals, setAllAppeals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        let isMounted = true;

        async function loadAppeals() {
            try {
                setIsLoading(true);
                setErrorMessage("");

                const data = await appealsApi.getAppeals();

                const mappedAppeals = (data.appeals || []).map(mapAppealFromApi);

                if (isMounted) {
                    setAllAppeals(mappedAppeals);
                }
            } catch (error) {
                if (isMounted) {
                    setErrorMessage(
                        error.message || "Не удалось загрузить обращения"
                    );
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        loadAppeals();

        return () => {
            isMounted = false;
        };
    }, []);

    const appeals = useMemo(() => {
        if (currentStatus === "all") {
            return allAppeals;
        }

        return allAppeals.filter((appeal) => appeal.status === currentStatus);
    }, [allAppeals, currentStatus]);

    const statusItems = useMemo(() => {
        return STATUS_VALUES.map((itemStatus) => ({
            value: itemStatus,
            label: STATUS_LABELS[itemStatus],
            count:
                itemStatus === "all"
                    ? allAppeals.length
                    : allAppeals.filter((appeal) => appeal.status === itemStatus)
                          .length,
        }));
    }, [allAppeals]);

    return (
        <section className="page">
            <div className="page-header">
                <div>
                    <p className="eyebrow">Обращения</p>

                    <h2>Поддержка пользователей</h2>

                    <p>
                        Вопросы пользователей и предложения по развитию проекта.
                    </p>
                </div>
            </div>

            {errorMessage ? (
                <div className="appeals-empty">{errorMessage}</div>
            ) : null}

            <AppealsStatusTabs items={statusItems} />

            {isLoading ? (
                <div className="appeals-empty">Загружаем обращения...</div>
            ) : (
                <AppealsTable appeals={appeals} />
            )}
        </section>
    );
}