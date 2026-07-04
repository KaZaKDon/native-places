import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { useAuth } from "../../../shared/auth/useAuth";
import { favoritesApi } from "../../../shared/api/favoritesApi";
import { myPlacesApi } from "../../../shared/api/myPlacesApi";
import { conversationsApi } from "../../../shared/api/conversationsApi";
import { subscriptionsApi } from "../../../shared/api/subscriptionsApi";
import { paymentsApi } from "../../../shared/api/paymentsApi";
import { accountBookTabs } from "../model/accountBookTabs";
import { AccountArchiveSection } from "./sections/AccountArchiveSection";
import { AccountFavoritesSection } from "./sections/AccountFavoritesSection";
import { AccountMessagesSection } from "./sections/AccountMessagesSection";
import { AccountPlacesSection } from "./sections/AccountPlacesSection";
import { AccountRoutesSection } from "./sections/AccountRoutesSection";
import { AccountSettingsSection } from "./sections/AccountSettingsSection";
import { getMediaUrl } from "../../../shared/api/mediaUrl";

import "./AccountBook.css";

const sectionComponents = {
    places: AccountPlacesSection,
    favorites: AccountFavoritesSection,
    messages: AccountMessagesSection,
    routes: AccountRoutesSection,
    archive: AccountArchiveSection,
    settings: AccountSettingsSection,
};


function formatPlanDuration(days) {
    const value = Number(days || 0);

    if (!value) {
        return "бессрочно";
    }

    return `${value} дн.`;
}

function formatPlanPrice(price) {
    const value = Number(price || 0);

    if (!value) {
        return "бесплатно";
    }

    return `${value.toLocaleString("ru-RU")} ₽`;
}

function formatDate(value) {
    if (!value) {
        return "без срока";
    }

    const date = new Date(String(value).replace(" ", "T"));

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

function SubscriptionModal({
    currentPlan,
    isChanging,
    onChangePlan,
    onClose,
    plans = [],
}) {
    return (
        <div className="account-tariff-modal" role="dialog" aria-modal="true">
            <div className="account-tariff-modal__panel">
                <button
                    className="account-tariff-modal__close"
                    type="button"
                    onClick={onClose}
                    aria-label="Закрыть выбор тарифа"
                >
                    ×
                </button>

                <h2>Сменить тариф</h2>
                <p>
                    Выберите новый тариф. Бесплатные тарифы включатся сразу,
                    платные отправят на оплату.
                </p>

                <div className="account-tariff-modal__plans">
                    {plans.map((plan) => {
                        const isCurrent = String(currentPlan?.id || "") === String(plan.id);

                        return (
                            <button
                                className={isCurrent
                                    ? "account-tariff-option is-current"
                                    : "account-tariff-option"}
                                disabled={isChanging || isCurrent}
                                key={plan.id}
                                type="button"
                                onClick={() => onChangePlan(plan.id)}
                            >
                                <strong>{plan.title}</strong>
                                <span>{plan.description}</span>
                                <small>
                                    До {plan.maxPlaces || "∞"} объявл. · {formatPlanDuration(plan.durationDays)}
                                </small>
                                <b>{formatPlanPrice(plan.price)}</b>
                                {isCurrent && <em>Текущий тариф</em>}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function mapUserToProfile(user) {
    return {
        name: user?.first_name || "Исследователь",
        status: user?.profile_status || "Дневник родных мест",
        avatar: getMediaUrl(user?.avatar),
    };
}

export function AccountBook() {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();

    const queryTab = searchParams.get("tab");
    const activeTab = sectionComponents[queryTab] ? queryTab : "places";
    const [profileOverride, setProfileOverride] = useState(null);

    const [places, setPlaces] = useState([]);
    const [favorites, setFavorites] = useState([]);
    const [conversations, setConversations] = useState([]);
    const [subscriptionInfo, setSubscriptionInfo] = useState(null);
    const [subscriptionLoading, setSubscriptionLoading] = useState(true);
    const [subscriptionError, setSubscriptionError] = useState("");
    const [isTariffModalOpen, setIsTariffModalOpen] = useState(false);
    const [isChangingTariff, setIsChangingTariff] = useState(false);

    const [placesLoading, setPlacesLoading] = useState(true);
    const [favoritesLoading, setFavoritesLoading] = useState(true);
    const [messagesLoading, setMessagesLoading] = useState(true);

    const profile = useMemo(() => {
        return profileOverride ?? mapUserToProfile(user);
    }, [profileOverride, user]);

    
    useEffect(() => {
        let isMounted = true;

        async function loadSubscription() {
            try {
                const data = await subscriptionsApi.getCurrentSubscription();

                if (!isMounted) {
                    return;
                }

                setSubscriptionInfo(data);
                setSubscriptionError("");
            } catch (error) {
                console.error("Не удалось загрузить тариф:", error);

                if (isMounted) {
                    setSubscriptionInfo(null);
                    setSubscriptionError(error.message || "Тариф не загрузился");
                }
            } finally {
                if (isMounted) {
                    setSubscriptionLoading(false);
                }
            }
        }

        loadSubscription();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;

        async function loadPlaces() {
            try {
                const data = await myPlacesApi.getMyPlaces();

                if (!isMounted) {
                    return;
                }

                setPlaces(Array.isArray(data.places) ? data.places : []);
            } catch (error) {
                console.error("Не удалось загрузить мои места:", error);

                if (isMounted) {
                    setPlaces([]);
                }
            } finally {
                if (isMounted) {
                    setPlacesLoading(false);
                }
            }
        }

        loadPlaces();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;

        async function loadFavorites() {
            try {
                const data = await favoritesApi.getFavorites();

                if (!isMounted) {
                    return;
                }

                setFavorites(
                    Array.isArray(data.favorites) ? data.favorites : []
                );
            } catch (error) {
                console.error("Не удалось загрузить избранное:", error);

                if (isMounted) {
                    setFavorites([]);
                }
            } finally {
                if (isMounted) {
                    setFavoritesLoading(false);
                }
            }
        }

        loadFavorites();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;

        async function loadConversations() {
            try {
                const data = await conversationsApi.getConversations();

                if (!isMounted) {
                    return;
                }

                setConversations(
                    Array.isArray(data.conversations)
                        ? data.conversations
                        : []
                );
            } catch (error) {
                console.error("Не удалось загрузить диалоги:", error);

                if (isMounted) {
                    setConversations([]);
                }
            } finally {
                if (isMounted) {
                    setMessagesLoading(false);
                }
            }
        }

        loadConversations();

        return () => {
            isMounted = false;
        };
    }, []);


    async function handleChangePlan(planId) {
        try {
            setIsChangingTariff(true);
            const data = await subscriptionsApi.changeSubscription(planId);

            if (data.confirmationUrl) {
                window.location.href = data.confirmationUrl;
                return;
            }

            if (data.paymentRequired) {
                const payment = await paymentsApi.createPayment({
                    paymentId: data.paymentId,
                    planId,
                    returnUrl: window.location.href,
                });

                if (payment.confirmationUrl) {
                    window.location.href = payment.confirmationUrl;
                    return;
                }

                window.alert(
                    payment.message ||
                        "Платёж создан, но ссылка оплаты пока не получена."
                );
                return;
            }

            setSubscriptionInfo(data);
            setSubscriptionError("");
            setIsTariffModalOpen(false);
        } catch (error) {
            console.error("Не удалось сменить тариф:", error);
            window.alert(error.message || "Не удалось сменить тариф");
        } finally {
            setIsChangingTariff(false);
        }
    }

    function handleTabChange(tabId) {
        setSearchParams((currentParams) => {
            const nextParams = new URLSearchParams(currentParams);
            nextParams.set("tab", tabId);
            return nextParams;
        });
    }

    const totalMessages = conversations.reduce(
        (total, conversation) => total + (conversation.messageCount || 0),
        0
    );
    const unreadMessages = conversations.reduce(
        (total, conversation) => total + (conversation.unreadCount || 0),
        0
    );

    const stats = {
        places: places.length,
        favorites: favorites.length,
        messages: totalMessages || conversations.length,
        unreadMessages,
    };

    const ActiveSection = sectionComponents[activeTab] || AccountPlacesSection;

    return (
        <section className="account-book" aria-label="Личный кабинет">
            <div className="account-book__left">
                <div className="account-book__avatar">
                    {profile.avatar ? (
                        <img src={profile.avatar} alt={profile.name} />
                    ) : (
                        "РМ"
                    )}
                </div>

                <h2>{profile.name}</h2>
                <p>{profile.status}</p>

                <div className="account-book__stats">
                    <div>
                        <strong>{placesLoading ? "…" : stats.places}</strong>
                        <span>мест</span>
                    </div>

                    <div>
                        <strong>
                            {favoritesLoading ? "…" : stats.favorites}
                        </strong>
                        <span>избранных</span>
                    </div>

                    <div>
                        <strong>
                            {messagesLoading ? "…" : stats.messages}
                        </strong>
                        <span>
                            сообщений
                            {stats.unreadMessages > 0
                                ? ` · ${stats.unreadMessages} новых`
                                : ""}
                        </span>
                    </div>
                </div>

                <blockquote>
                    «Память о местах делает нас ближе к своим корням»
                </blockquote>

                <button
                    className="account-tariff-card"
                    type="button"
                    onClick={() => setIsTariffModalOpen(true)}
                >
                    <span>Сейчас тариф</span>
                    <strong>
                        {subscriptionLoading
                            ? "Загружаем…"
                            : subscriptionInfo?.plan?.title || "не выбран"}
                    </strong>
                    {subscriptionInfo?.plan ? (
                        <small>
                            {subscriptionInfo.usage.used} из {subscriptionInfo.usage.limit || "∞"} объявл. · до {formatDate(subscriptionInfo.subscription?.expires_at)}
                        </small>
                    ) : (
                        <small>{subscriptionError || "Нажмите, чтобы выбрать тариф"}</small>
                    )}
                    <em>Поменять</em>
                </button>
            </div>

            <div className="account-book__right">
                <ActiveSection
                    places={places}
                    setPlaces={setPlaces}
                    placesLoading={placesLoading}
                    favorites={favorites}
                    setFavorites={setFavorites}
                    favoritesLoading={favoritesLoading}
                    onProfileUpdate={setProfileOverride}
                />
            </div>

            <nav className="account-book__tabs" aria-label="Разделы кабинета">
                {accountBookTabs.map((tab) => (
                    <button
                        className={
                            activeTab === tab.id
                                ? "account-book__tab account-book__tab--active"
                                : "account-book__tab"
                        }
                        key={tab.id}
                        type="button"
                        onClick={() => handleTabChange(tab.id)}
                    >
                        {tab.title}
                    </button>
                ))}
            </nav>

            {isTariffModalOpen && (
                <SubscriptionModal
                    currentPlan={subscriptionInfo?.plan}
                    isChanging={isChangingTariff}
                    onChangePlan={handleChangePlan}
                    onClose={() => setIsTariffModalOpen(false)}
                    plans={subscriptionInfo?.availablePlans || []}
                />
            )}
        </section>
    );
}