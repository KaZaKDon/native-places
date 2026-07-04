import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { profileApi } from "../../../../shared/api/profileApi";
import { appealsApi } from "../../../../shared/api/appealsApi";
import { conversationsApi } from "../../../../shared/api/conversationsApi";
import { useAuth } from "../../../../shared/auth/useAuth";
import { getMediaUrl } from "../../../../shared/api/mediaUrl";

import "./AccountSettingsSection.css";

const appealTypeTitles = {
    support: "Поддержка",
    idea: "Предложение",
};

const appealStatusTitles = {
    new: "Новое",
    in_work: "В работе",
    closed: "Рассмотрено",
};

function mapUserToProfile(user) {
    return {
        name: user?.first_name || "Исследователь",
        status: user?.profile_status || "Дневник родных мест",
        avatar: getMediaUrl(user?.avatar),
        phone: user?.phone || "",
        telegram: user?.telegram || "",
    };
}

function formatDate(value) {
    if (!value) {
        return "";
    }

    const date = new Date(value.replace(" ", "T"));

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function AccountSettingsSection({ onProfileUpdate }) {
    const { user, updateUser } = useAuth();

    const [view, setView] = useState("settings");

    const [profile, setProfile] = useState(() => mapUserToProfile(user));
    const [profileOpen, setProfileOpen] = useState(false);
    const [profileStatus, setProfileStatus] = useState("");
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [passwordOpen, setPasswordOpen] = useState(false);
    const [passwordVisibility, setPasswordVisibility] = useState({
        currentPassword: false,
        newPassword: false,
        confirmPassword: false,
    });
    const [passwordStatus, setPasswordStatus] = useState("");
    const [passwordSaving, setPasswordSaving] = useState(false);

    const [contactOpen, setContactOpen] = useState(false);
    const [contactType, setContactType] = useState("support");
    const [contactValue, setContactValue] = useState("");
    const [contactText, setContactText] = useState("");
    const [contactStatus, setContactStatus] = useState("");
    const [contactSending, setContactSending] = useState(false);

    const [requests, setRequests] = useState([]);
    const [requestsLoading, setRequestsLoading] = useState(false);
    const [requestsError, setRequestsError] = useState("");
    const [activeRequest, setActiveRequest] = useState(null);
    const [conversations, setConversations] = useState([]);
    const [notificationsLoading, setNotificationsLoading] = useState(false);
    const [notificationsError, setNotificationsError] = useState("");

    useEffect(() => {
        let isMounted = true;

        async function loadSettingsData() {
            setRequestsLoading(true);
            setNotificationsLoading(true);
            setRequestsError("");
            setNotificationsError("");

            try {
                const [appealsData, conversationsData] = await Promise.all([
                    appealsApi.getMyAppeals(),
                    conversationsApi.getConversations(),
                ]);

                if (!isMounted) {
                    return;
                }

                setRequests(appealsData.appeals);
                setConversations(conversationsData.conversations);
            } catch (error) {
                console.error("Не удалось загрузить данные настроек:", error);

                if (isMounted) {
                    setRequests([]);
                    setConversations([]);
                    setRequestsError(
                        error.message || "Не удалось загрузить обращения."
                    );
                    setNotificationsError(
                        error.message || "Не удалось загрузить уведомления."
                    );
                }
            } finally {
                if (isMounted) {
                    setRequestsLoading(false);
                    setNotificationsLoading(false);
                }
            }
        }

        loadSettingsData();

        return () => {
            isMounted = false;
        };
    }, []);

    function handleProfileChange(event) {
        const { name, value } = event.target;

        setProfile((currentProfile) => ({
            ...currentProfile,
            [name]: value,
        }));

        setProfileStatus("");
    }

    function closeProfileModal() {
        setProfileOpen(false);
        setProfileStatus("");
    }

    function handlePasswordChange(event) {
        const { name, value } = event.target;

        setPasswordForm((currentForm) => ({
            ...currentForm,
            [name]: value,
        }));

        setPasswordStatus("");
    }

    function togglePasswordVisibility(fieldName) {
        setPasswordVisibility((currentVisibility) => ({
            ...currentVisibility,
            [fieldName]: !currentVisibility[fieldName],
        }));
    }

    function closePasswordModal() {
        setPasswordOpen(false);
        setPasswordStatus("");
        setPasswordVisibility({
            currentPassword: false,
            newPassword: false,
            confirmPassword: false,
        });
    }

    async function handleAvatarChange(event) {
        const file = event.target.files?.[0];

        if (!file) {
            setProfileStatus("Файл не выбран.");
            return;
        }

        const maxAvatarSize = 3 * 1024 * 1024;

        if (file.size > maxAvatarSize) {
            setProfileStatus("Фото слишком большое. Максимальный размер — 3 МБ.");
            event.target.value = "";
            return;
        }

        setProfileStatus("Загружаем фото...");

        try {
            const data = await profileApi.uploadAvatar(file);

            const updatedProfile = {
                ...profile,
                avatar: getMediaUrl(data.avatar),
            };

            setProfile(updatedProfile);

            updateUser({
                avatar: data.avatar,
            });

            onProfileUpdate?.(updatedProfile);

            setProfileStatus("Фото профиля обновлено.");
        } catch (error) {
            console.error("AVATAR_UPLOAD_ERROR:", error);
            setProfileStatus(error.message || "Не удалось обновить фото.");
        }
    }

    async function handleSaveProfile(event) {
        event.preventDefault();

        setProfileStatus("");

        const nextName = profile.name.trim() || "Исследователь";
        const nextStatus = profile.status.trim();

        try {
            const data = await profileApi.updateProfile({
                firstName: nextName,
                profileStatus: nextStatus,
                phone: profile.phone,
                telegram: profile.telegram,
            });

            const updatedProfile = {
                name: data.profile.first_name || "Исследователь",
                status: data.profile.profile_status || "Дневник родных мест",
                avatar: profile.avatar,
                phone: data.profile.phone || "",
                telegram: data.profile.telegram || "",
            };

            setProfile(updatedProfile);

            updateUser({
                first_name: data.profile.first_name,
                profile_status: data.profile.profile_status,
                phone: data.profile.phone,
                telegram: data.profile.telegram,
            });

            onProfileUpdate?.(updatedProfile);

            setProfileStatus("Профиль сохранён.");
        } catch (error) {
            setProfileStatus(error.message || "Не удалось сохранить профиль.");
        }
    }

    async function handleChangePassword(event) {
        event.preventDefault();

        const currentPassword = passwordForm.currentPassword;
        const newPassword = passwordForm.newPassword;
        const confirmPassword = passwordForm.confirmPassword;

        if (!currentPassword.trim()) {
            setPasswordStatus("Введите текущий пароль.");
            return;
        }

        if (newPassword.length < 6) {
            setPasswordStatus("Новый пароль должен содержать минимум 6 символов.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordStatus("Новый пароль и повтор не совпадают.");
            return;
        }

        setPasswordSaving(true);
        setPasswordStatus("");

        try {
            await profileApi.changePassword({
                currentPassword,
                newPassword,
            });

            setPasswordForm({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            });
            setPasswordStatus("Пароль обновлён.");
        } catch (error) {
            setPasswordStatus(error.message || "Не удалось обновить пароль.");
        } finally {
            setPasswordSaving(false);
        }
    }

    async function handleSendContact(event) {
        event.preventDefault();

        const text = contactText.trim();

        if (!text) {
            setContactStatus("Напишите сообщение.");
            return;
        }

        setContactSending(true);
        setContactStatus("");

        try {
            await appealsApi.createAppeal({
                type: contactType,
                contact: contactValue.trim(),
                message: text,
            });

            const data = await appealsApi.getMyAppeals();

            setRequests(data.appeals);
            setContactText("");
            setContactValue("");
            setContactStatus("Обращение отправлено.");
        } catch (error) {
            console.error("Не удалось отправить обращение:", error);
            setContactStatus(error.message || "Не удалось отправить обращение.");
        } finally {
            setContactSending(false);
        }
    }

    const unreadMessagesCount = conversations.reduce((count, conversation) => {
        return count + Number(conversation.unreadCount || 0);
    }, 0);
    const activeAppealsCount = requests.filter((request) => {
        return request.status === "new" || request.status === "in_work";
    }).length;
    const answeredAppealsCount = requests.filter((request) => {
        return request.status === "closed" && request.adminResponse;
    }).length;
    const hasNotifications =
        unreadMessagesCount > 0 ||
        activeAppealsCount > 0 ||
        answeredAppealsCount > 0;

    if (view === "requests") {
        return (
            <div className="account-book-section">
                <h1>Обращения</h1>

                <button
                    className="account-book-section__button account-settings-contact"
                    type="button"
                    onClick={() => setView("settings")}
                >
                    ← Назад к настройкам
                </button>

                {requestsLoading ? (
                    <div className="account-book-empty">
                        <h2>Загружаем обращения</h2>
                        <p>Получаем ваши обращения из базы.</p>
                    </div>
                ) : requestsError ? (
                    <div className="account-book-empty">
                        <h2>Не удалось загрузить обращения</h2>
                        <p>{requestsError}</p>
                    </div>
                ) : requests.length === 0 ? (
                    <div className="account-book-empty">
                        <h2>Обращений пока нет</h2>
                        <p>
                            Здесь будут ваши вопросы в поддержку и предложения по проекту.
                        </p>
                    </div>
                ) : (
                    <div className="account-support-list">
                        {requests.map((request) => (
                            <article
                                className="account-support-item"
                                key={request.id}
                            >
                                <div>
                                    <strong>
                                        {appealTypeTitles[request.type] ??
                                            "Обращение"}
                                    </strong>

                                    <span className="account-support-item__badge">
                                        {appealStatusTitles[request.status] ??
                                            request.status}
                                    </span>

                                    {request.createdAt && (
                                        <p>{formatDate(request.createdAt)}</p>
                                    )}
                                </div>

                                <div className="account-support-item__actions">
                                    <button
                                        className="account-book-place__action"
                                        type="button"
                                        onClick={() => setActiveRequest(request)}
                                    >
                                        Посмотреть
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}

                {activeRequest && (
                    <div
                        className="account-contact-modal"
                        role="dialog"
                        aria-modal="true"
                    >
                        <div className="account-contact-modal__card">
                            <button
                                className="account-contact-modal__close"
                                type="button"
                                onClick={() => setActiveRequest(null)}
                                aria-label="Закрыть окно"
                            >
                                ×
                            </button>

                            <h2>
                                {appealTypeTitles[activeRequest.type] ??
                                    "Обращение"}
                            </h2>

                            <p>
                                <strong>Статус:</strong>{" "}
                                {appealStatusTitles[activeRequest.status] ??
                                    activeRequest.status}
                            </p>

                            {activeRequest.contact && (
                                <p>
                                    <strong>Контакт:</strong>{" "}
                                    {activeRequest.contact}
                                </p>
                            )}

                            {activeRequest.createdAt && (
                                <p>
                                    <strong>Дата:</strong>{" "}
                                    {formatDate(activeRequest.createdAt)}
                                </p>
                            )}

                            <p>{activeRequest.text}</p>

                            {activeRequest.adminResponse ? (
                                <div className="account-support-response">
                                    <strong>Ответ администрации</strong>
                                    <p>{activeRequest.adminResponse}</p>
                                </div>
                            ) : (
                                <div className="account-support-response">
                                    <strong>Ответ администрации</strong>
                                    <p>Пока ответа нет.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="account-book-section">
            <h1>Настройки</h1>

            <div className="account-settings-actions">

                <button
                    className="account-book-section__button account-settings-contact"
                    type="button"
                    onClick={() => setProfileOpen(true)}
                >
                    Профиль
                </button>

                <button
                    className="account-book-section__button account-settings-contact"
                    type="button"
                    onClick={() => setPasswordOpen(true)}
                >
                    Пароль
                </button>

                <button
                    className="account-book-section__button account-settings-contact"
                    type="button"
                    onClick={() => setContactOpen(true)}
                >
                    Связаться
                </button>

                <button
                    className="account-book-section__button account-settings-contact"
                    type="button"
                    onClick={() => setView("requests")}
                >
                    Обращения
                </button>

            </div>

            <section className="account-settings-notifications">
                <div>
                    <span>Уведомления</span>
                    <h2>Что требует внимания</h2>
                </div>

                {notificationsLoading ? (
                    <p>Проверяем сообщения и обращения...</p>
                ) : notificationsError ? (
                    <p>{notificationsError}</p>
                ) : hasNotifications ? (
                    <div className="account-settings-notifications__grid">
                        <Link
                            className="account-settings-notification"
                            to="/account?tab=messages"
                        >
                            <strong>{unreadMessagesCount}</strong>
                            <span>непрочитанных сообщений</span>
                        </Link>

                        <button
                            className="account-settings-notification"
                            type="button"
                            onClick={() => setView("requests")}
                        >
                            <strong>{activeAppealsCount}</strong>
                            <span>обращений в работе</span>
                        </button>

                        <button
                            className="account-settings-notification"
                            type="button"
                            onClick={() => setView("requests")}
                        >
                            <strong>{answeredAppealsCount}</strong>
                            <span>ответов администрации</span>
                        </button>
                    </div>
                ) : (
                    <p>
                        Новых уведомлений нет. Здесь появятся новые сообщения,
                        ответы администрации и обращения в работе.
                    </p>
                )}
            </section>

            {profileOpen && (
                <div
                    className="account-contact-modal"
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="account-contact-modal__card">
                        <button
                            className="account-contact-modal__close"
                            type="button"
                            onClick={closeProfileModal}
                            aria-label="Закрыть окно"
                        >
                            ×
                        </button>

                        <h2>Профиль</h2>

                        <form
                            className="account-contact-form"
                            onSubmit={handleSaveProfile}
                        >
                            <label>
                                <span>Имя</span>
                                <input
                                    type="text"
                                    name="name"
                                    value={profile.name}
                                    onChange={handleProfileChange}
                                />
                            </label>

                            <label>
                                <span>Статус</span>
                                <input
                                    type="text"
                                    name="status"
                                    value={profile.status}
                                    onChange={handleProfileChange}
                                />
                            </label>

                            <label>
                                <span>Телефон</span>
                                <input
                                    type="text"
                                    name="phone"
                                    value={profile.phone}
                                    onChange={handleProfileChange}
                                />
                            </label>

                            <label>
                                <span>Telegram</span>
                                <input
                                    type="text"
                                    name="telegram"
                                    value={profile.telegram}
                                    onChange={handleProfileChange}
                                />
                            </label>

                            <label>
                                <span>Фото профиля</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarChange}
                                />
                            </label>

                            {profileStatus && <p>{profileStatus}</p>}

                            <button
                                className="account-book-section__button"
                                type="submit"
                            >
                                Сохранить профиль
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {contactOpen && (
                <div
                    className="account-contact-modal"
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="account-contact-modal__card">
                        <button
                            className="account-contact-modal__close"
                            type="button"
                            onClick={() => setContactOpen(false)}
                            aria-label="Закрыть окно"
                        >
                            ×
                        </button>

                        <h2>Связаться</h2>

                        <div className="account-contact-modal__tabs">
                            <button
                                type="button"
                                className={
                                    contactType === "support" ? "is-active" : ""
                                }
                                onClick={() => {
                                    setContactType("support");
                                    setContactStatus("");
                                }}
                            >
                                Поддержка
                            </button>

                            <button
                                type="button"
                                className={
                                    contactType === "idea" ? "is-active" : ""
                                }
                                onClick={() => {
                                    setContactType("idea");
                                    setContactStatus("");
                                }}
                            >
                                Предложение
                            </button>
                        </div>

                        <form
                            className="account-contact-form"
                            onSubmit={handleSendContact}
                        >
                            <input
                                type="text"
                                value={contactValue}
                                placeholder="Email или Telegram для ответа"
                                onChange={(event) =>
                                    setContactValue(event.target.value)
                                }
                            />

                            <textarea
                                rows="5"
                                value={contactText}
                                placeholder={
                                    contactType === "idea"
                                        ? "Опишите предложение по проекту..."
                                        : "Напишите сообщение в поддержку..."
                                }
                                onChange={(event) => {
                                    setContactText(event.target.value);
                                    setContactStatus("");
                                }}
                            />

                            {contactStatus && <p>{contactStatus}</p>}

                            <button
                                className="account-book-section__button"
                                type="submit"
                                disabled={contactSending}
                            >
                                {contactSending ? "Отправляем..." : "Отправить"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {passwordOpen && (
                <div
                    className="account-contact-modal"
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="account-contact-modal__card">
                        <button
                            className="account-contact-modal__close"
                            type="button"
                            onClick={closePasswordModal}
                            aria-label="Закрыть окно"
                        >
                            ×
                        </button>

                        <h2>Сменить пароль</h2>

                        <form
                            className="account-contact-form"
                            onSubmit={handleChangePassword}
                        >
                            <label>
                                <span>Текущий пароль</span>
                                <span className="account-password-field">
                                    <input
                                        type={
                                            passwordVisibility.currentPassword
                                                ? "text"
                                                : "password"
                                        }
                                        name="currentPassword"
                                        value={passwordForm.currentPassword}
                                        autoComplete="current-password"
                                        onChange={handlePasswordChange}
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            togglePasswordVisibility("currentPassword")
                                        }
                                        aria-label={
                                            passwordVisibility.currentPassword
                                                ? "Скрыть текущий пароль"
                                                : "Показать текущий пароль"
                                        }
                                    >
                                        {passwordVisibility.currentPassword ? "🙈" : "👁️"}
                                    </button>
                                </span>
                            </label>

                            <label>
                                <span>Новый пароль</span>
                                <span className="account-password-field">
                                    <input
                                        type={
                                            passwordVisibility.newPassword
                                                ? "text"
                                                : "password"
                                        }
                                        name="newPassword"
                                        value={passwordForm.newPassword}
                                        autoComplete="new-password"
                                        onChange={handlePasswordChange}
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            togglePasswordVisibility("newPassword")
                                        }
                                        aria-label={
                                            passwordVisibility.newPassword
                                                ? "Скрыть новый пароль"
                                                : "Показать новый пароль"
                                        }
                                    >
                                        {passwordVisibility.newPassword ? "🙈" : "👁️"}
                                    </button>
                                </span>
                            </label>

                            <label>
                                <span>Повторите новый пароль</span>
                                <span className="account-password-field">
                                    <input
                                        type={
                                            passwordVisibility.confirmPassword
                                                ? "text"
                                                : "password"
                                        }
                                        name="confirmPassword"
                                        value={passwordForm.confirmPassword}
                                        autoComplete="new-password"
                                        onChange={handlePasswordChange}
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            togglePasswordVisibility("confirmPassword")
                                        }
                                        aria-label={
                                            passwordVisibility.confirmPassword
                                                ? "Скрыть повтор пароля"
                                                : "Показать повтор пароля"
                                        }
                                    >
                                        {passwordVisibility.confirmPassword ? "🙈" : "👁️"}
                                    </button>
                                </span>
                            </label>

                            {passwordStatus && <p>{passwordStatus}</p>}

                            <button
                                className="account-book-section__button"
                                type="submit"
                                disabled={passwordSaving}
                            >
                                {passwordSaving ? "Сохраняем..." : "Сменить пароль"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}