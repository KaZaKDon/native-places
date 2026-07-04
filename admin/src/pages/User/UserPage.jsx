import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { BackButton } from "../../components/BackButton/BackButton";
import { NotFoundState } from "../../components/NotFoundState/NotFoundState";
import { StatusBadge } from "../../components/StatusBadge/StatusBadge";

import { roleLabels } from "../../config/roles";
import { useAdminAuth } from "../../context/useAdminAuth";
import { usersApi } from "../../shared/api/usersApi";

import { UserInfoCard } from "./components/UserInfoCard";
import { UserPlaces } from "./components/UserPlaces";
import { UserSubscriptionCard } from "./components/UserSubscriptionCard";
import { UserSubscriptionsHistory } from "./components/UserSubscriptionsHistory";
import { UserManagementCard } from "./components/UserManagementCard";

import "./UserPage.css";

function getUserName(user) {
    return [user.first_name, user.last_name].filter(Boolean).join(" ") || "Без имени";
}

function createMainInfo(user) {
    return [
        { label: "ID", value: `#${user.id}` },
        { label: "Email", value: user.email || "—" },
        { label: "Телефон", value: user.phone || "—" },
        { label: "Telegram", value: user.telegram || "—" },
        { label: "Роль", value: roleLabels[user.role_code] || user.role_title || "—" },
        { label: "Дата регистрации", value: user.created_at || "—" },
        { label: "Обновлён", value: user.updated_at || "—" },
    ];
}

export function UserPage() {
    const { role } = useAdminAuth();
    const canManageUsers = role === "admin";

    const { userId } = useParams();

    const [user, setUser] = useState(null);
    const [places, setPlaces] = useState([]);
    const [subscription, setSubscription] = useState(null);
    const [subscriptions, setSubscriptions] = useState([]);
    const [reloadKey, setReloadKey] = useState(0);

    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        let isMounted = true;

        async function loadUser() {
            try {
                setIsLoading(true);
                setErrorMessage("");

                const data = await usersApi.getUser(userId);

                if (isMounted) {
                    setUser(data.user || null);
                    setPlaces(data.places || []);
                    setSubscription(data.subscription || null);
                    setSubscriptions(data.subscriptions || []);
                }
            } catch (error) {
                if (isMounted) {
                    setErrorMessage(error.message || "Не удалось загрузить пользователя");
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        loadUser();

        return () => {
            isMounted = false;
        };
    }, [userId, reloadKey]);

    const mainInfo = useMemo(() => {
        if (!user) {
            return [];
        }

        return createMainInfo(user);
    }, [user]);

    function refreshUser() {
        setReloadKey((currentKey) => currentKey + 1);
    }

    if (isLoading) {
        return (
            <section className="page">
                <BackButton />

                <div className="user-section">
                    Загружаем пользователя...
                </div>
            </section>
        );
    }

    if (errorMessage || !user) {
        return (
            <NotFoundState
                eyebrow={`Пользователь #${userId}`}
                title="Пользователь не найден"
                description={errorMessage || "Пользователь отсутствует или был удалён."}
            />
        );
    }

    return (
        <section className="page">
            <BackButton />

            <div className="page-header">
                <div>
                    <p className="eyebrow">Пользователь #{user.id}</p>

                    <h2>{getUserName(user)}</h2>

                    <p>Карточка пользователя Native Places.</p>
                </div>

                <StatusBadge status={user.status} />
            </div>

            <div className="user-page-grid">
                <div className="user-page-main">
                    <UserInfoCard title="Основная информация" items={mainInfo} />

                    <UserPlaces places={places} />
                </div>

                <aside className="user-page-aside">
                    <article className="user-section">
                        <h3>Статистика</h3>

                        <div className="user-info-list">
                            <div>
                                <span>Объявлений</span>
                                <strong>{places.length}</strong>
                            </div>

                            <div>
                                <span>Роль</span>
                                <strong>
                                    {roleLabels[user.role_code] || user.role_title || "—"}
                                </strong>
                            </div>

                            <div>
                                <span>Статус</span>
                                <strong>{user.status}</strong>
                            </div>
                        </div>
                    </article>

                    {canManageUsers ? (
                        <UserManagementCard
                            user={user}
                            onUpdated={refreshUser}
                        />
                    ) : null}

                    <UserSubscriptionCard
                        userId={user.id}
                        subscription={subscription}
                        onUpdated={refreshUser}
                        canManage={canManageUsers}
                    />
                    <UserSubscriptionsHistory subscriptions={subscriptions} />
                </aside>
            </div>
        </section>
    );
}