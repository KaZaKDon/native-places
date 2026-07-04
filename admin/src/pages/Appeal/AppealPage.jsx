import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import { BackButton } from "../../components/BackButton/BackButton";
import { NotFoundState } from "../../components/NotFoundState/NotFoundState";
import { StatusBadge } from "../../components/StatusBadge/StatusBadge";

import { appealsApi } from "../../shared/api/appealsApi";

import "./AppealPage.css";

const APPEAL_TYPE_LABELS = {
    support: "Поддержка",
    idea: "Предложение",
};

const STATUS_OPTIONS = [
    {
        value: "new",
        label: "Новое",
    },
    {
        value: "in_work",
        label: "В работе",
    },
    {
        value: "closed",
        label: "Рассмотрено",
    },
];

function getUserName(appeal) {
    return (
        [appeal.user_first_name, appeal.user_last_name]
            .filter(Boolean)
            .join(" ") ||
        appeal.user_email ||
        "—"
    );
}

function getAppealTypeTitle(type) {
    return APPEAL_TYPE_LABELS[type] || "Обращение";
}

function createInfo(appeal) {
    return [
        {
            label: "ID",
            value: `#${appeal.id}`,
        },
        {
            label: "Тип",
            value: getAppealTypeTitle(appeal.appeal_type),
        },
        {
            label: "Дата",
            value: appeal.created_at || "—",
        },
        {
            label: "Обновлено",
            value: appeal.updated_at || "—",
        },
        {
            label: "Закрыто",
            value: appeal.closed_at || "—",
        },
        {
            label: "Пользователь",
            value: getUserName(appeal),
        },
        {
            label: "Контакт",
            value: appeal.contact || "—",
        },
    ];
}

export function AppealPage() {
    const { appealId } = useParams();
    const navigate = useNavigate();

    const [appeal, setAppeal] = useState(null);
    const [status, setStatus] = useState("new");
    const [adminResponse, setAdminResponse] = useState("");

    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    useEffect(() => {
        let isMounted = true;

        async function loadAppeal() {
            try {
                setIsLoading(true);
                setErrorMessage("");

                const data = await appealsApi.getAppeal(appealId);
                const loadedAppeal = data.appeal || null;

                if (isMounted) {
                    setAppeal(loadedAppeal);
                    setStatus(loadedAppeal?.status || "new");
                    setAdminResponse(loadedAppeal?.admin_response || "");
                }
            } catch (error) {
                if (isMounted) {
                    setErrorMessage(
                        error.message || "Не удалось загрузить обращение"
                    );
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        loadAppeal();

        return () => {
            isMounted = false;
        };
    }, [appealId]);

    const info = useMemo(() => {
        if (!appeal) {
            return [];
        }

        return createInfo(appeal);
    }, [appeal]);

    async function handleSaveAppeal() {
        if (!appeal) {
            return;
        }

        try {
            setIsActionLoading(true);
            setErrorMessage("");
            setSuccessMessage("");

            await appealsApi.updateAppeal({
                id: appeal.id,
                status,
                adminResponse,
            });

            setAppeal((currentAppeal) => ({
                ...currentAppeal,
                status,
                admin_response: adminResponse,
            }));

            setSuccessMessage("Обращение обновлено.");

            if (status === "closed") {
                navigate("/appeals/closed");
            }
        } catch (error) {
            setErrorMessage(error.message || "Не удалось обновить обращение");
        } finally {
            setIsActionLoading(false);
        }
    }

    if (isLoading) {
        return (
            <section className="page">
                <BackButton />

                <div className="appeal-section">
                    Загружаем обращение...
                </div>
            </section>
        );
    }

    if (errorMessage && !appeal) {
        return (
            <NotFoundState
                eyebrow={`Обращение #${appealId}`}
                title="Обращение не найдено"
                description={errorMessage}
            />
        );
    }

    if (!appeal) {
        return (
            <NotFoundState
                eyebrow={`Обращение #${appealId}`}
                title="Обращение не найдено"
                description="Обращение отсутствует или было удалено."
            />
        );
    }

    return (
        <section className="page">
            <BackButton />

            <div className="page-header">
                <div>
                    <p className="eyebrow">Обращение #{appeal.id}</p>

                    <h2>{getAppealTypeTitle(appeal.appeal_type)}</h2>

                    <p>Пользователь: {getUserName(appeal)}</p>
                </div>

                <StatusBadge status={appeal.status} />
            </div>

            {errorMessage ? (
                <div className="appeal-section">
                    {errorMessage}
                </div>
            ) : null}

            {successMessage ? (
                <div className="appeal-section appeal-section--success">
                    {successMessage}
                </div>
            ) : null}

            <div className="appeal-page-grid">
                <div className="appeal-page-main">
                    <article className="appeal-section">
                        <h3>Сообщение пользователя</h3>

                        <p>{appeal.message || "Сообщение не заполнено."}</p>
                    </article>

                    <article className="appeal-section">
                        <h3>Связанные данные</h3>

                        <div className="appeal-links">
                            {appeal.user_id ? (
                                <Link to={`/users/view/${appeal.user_id}`}>
                                    Открыть пользователя: {getUserName(appeal)}
                                </Link>
                            ) : null}

                            {appeal.user_email ? (
                                <span>Email: {appeal.user_email}</span>
                            ) : null}

                            {appeal.user_phone ? (
                                <span>Телефон: {appeal.user_phone}</span>
                            ) : null}

                            {appeal.user_telegram ? (
                                <span>Telegram: {appeal.user_telegram}</span>
                            ) : null}
                        </div>
                    </article>
                </div>

                <aside className="appeal-page-aside">
                    <article className="appeal-section">
                        <h3>Информация</h3>

                        <div className="appeal-info-list">
                            {info.map((item) => (
                                <div key={item.label}>
                                    <span>{item.label}</span>
                                    <strong>{item.value}</strong>
                                </div>
                            ))}
                        </div>
                    </article>

                    <article className="appeal-section">
                        <h3>Ответ администрации</h3>

                        <div className="appeal-form">
                            <label>
                                <span>Статус</span>

                                <select
                                    value={status}
                                    onChange={(event) => {
                                        setStatus(event.target.value);
                                        setSuccessMessage("");
                                        setErrorMessage("");
                                    }}
                                >
                                    {STATUS_OPTIONS.map((option) => (
                                        <option
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                <span>Ответ пользователю</span>

                                <textarea
                                    rows="7"
                                    value={adminResponse}
                                    placeholder="Напишите ответ, который пользователь увидит в кабинете."
                                    onChange={(event) => {
                                        setAdminResponse(event.target.value);
                                        setSuccessMessage("");
                                        setErrorMessage("");
                                    }}
                                />
                            </label>

                            <button
                                type="button"
                                onClick={handleSaveAppeal}
                                disabled={isActionLoading}
                            >
                                {isActionLoading
                                    ? "Сохраняем..."
                                    : "Сохранить ответ"}
                            </button>
                        </div>
                    </article>
                </aside>
            </div>
        </section>
    );
}