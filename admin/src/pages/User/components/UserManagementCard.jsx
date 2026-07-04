import { useState } from "react";

import { usersApi } from "../../../shared/api/usersApi";

export function UserManagementCard({ user, onUpdated }) {
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [accessCode, setAccessCode] = useState("");

    const isModerator = user.role_code === "moderator";
    const isAdmin = user.role_code === "admin";

    async function handleMakeModerator() {
        try {
            setIsSaving(true);
            setMessage("");
            setAccessCode("");

            await usersApi.makeModerator(user.id);

            setMessage("Пользователь назначен модератором");

            if (onUpdated) {
                await onUpdated();
            }
        } catch (error) {
            setMessage(error.message || "Не удалось назначить модератора");
        } finally {
            setIsSaving(false);
        }
    }

    async function handleGenerateCode() {
        try {
            setIsSaving(true);
            setMessage("");
            setAccessCode("");

            const data = await usersApi.generateModeratorCode(user.id, 30);

            setAccessCode(data.access_code || "");
            setMessage("Код доступа создан. Скопируйте его и передайте модератору.");
        } catch (error) {
            setMessage(error.message || "Не удалось создать код доступа");
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <article className="user-section">
            <h3>Модерация</h3>

            <div className="user-info-list">
                <div>
                    <span>Текущая роль</span>
                    <strong>{user.role_title || user.role_code || "—"}</strong>
                </div>

                <div>
                    <span>Тип доступа</span>
                    <strong>
                        {isModerator
                            ? "Код доступа модератора"
                            : isAdmin
                                ? "Email и пароль администратора"
                                : "Обычный пользователь"}
                    </strong>
                </div>
            </div>

            <div className="user-management">
                {!isAdmin && !isModerator ? (
                    <button
                        type="button"
                        className="user-action-button user-action-button--primary"
                        onClick={handleMakeModerator}
                        disabled={isSaving}
                    >
                        {isSaving ? "Сохраняем..." : "Сделать модератором"}
                    </button>
                ) : null}

                {isModerator ? (
                    <button
                        type="button"
                        className="user-action-button user-action-button--primary"
                        onClick={handleGenerateCode}
                        disabled={isSaving}
                    >
                        {isSaving ? "Создаём..." : "Создать новый код доступа"}
                    </button>
                ) : null}

                {accessCode ? (
                    <div className="user-info-list">
                        <div>
                            <span>Новый код доступа</span>
                            <strong>{accessCode}</strong>
                        </div>
                    </div>
                ) : null}

                {message ? (
                    <p className="user-history-empty">
                        {message}
                    </p>
                ) : null}
            </div>
        </article>
    );
}