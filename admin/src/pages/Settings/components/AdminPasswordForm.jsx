import { useState } from "react";

import { adminAuthApi } from "../../../shared/api/adminAuthApi";

const EMPTY_FORM = {
    currentPassword: "",
    newPassword: "",
    newPasswordConfirmation: "",
};

export function AdminPasswordForm() {
    const [form, setForm] = useState(EMPTY_FORM);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    function handleChange(field, value) {
        setForm((currentForm) => ({
            ...currentForm,
            [field]: value,
        }));
        setErrorMessage("");
        setSuccessMessage("");
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (form.newPassword.length < 8) {
            setErrorMessage("Новый пароль должен содержать минимум 8 символов");
            return;
        }

        if (form.newPassword !== form.newPasswordConfirmation) {
            setErrorMessage("Новый пароль и его повтор не совпадают");
            return;
        }

        try {
            setIsSaving(true);
            setErrorMessage("");
            setSuccessMessage("");

            const data = await adminAuthApi.changePassword(
                form.currentPassword,
                form.newPassword,
                form.newPasswordConfirmation
            );

            setForm(EMPTY_FORM);
            setSuccessMessage(
                data.message || "Пароль администратора успешно изменён"
            );
        } catch (error) {
            setErrorMessage(
                error?.message || "Не удалось изменить пароль администратора"
            );
        } finally {
            setIsSaving(false);
        }
    }

    const isSubmitDisabled =
        isSaving ||
        !form.currentPassword ||
        !form.newPassword ||
        !form.newPasswordConfirmation;

    return (
        <form className="admin-password-form" onSubmit={handleSubmit}>
            <div className="admin-password-form__header">
                <div>
                    <h3>Пароль администратора</h3>
                    <p>
                        Для смены пароля укажите действующий пароль и дважды
                        введите новый.
                    </p>
                </div>

                <span className="status-badge">Безопасность</span>
            </div>

            <div className="admin-password-form__fields">
                <label className="settings-field">
                    <span>Текущий пароль</span>
                    <input
                        type="password"
                        value={form.currentPassword}
                        autoComplete="current-password"
                        onChange={(event) =>
                            handleChange("currentPassword", event.target.value)
                        }
                        required
                    />
                </label>

                <label className="settings-field">
                    <span>Новый пароль</span>
                    <input
                        type="password"
                        value={form.newPassword}
                        autoComplete="new-password"
                        minLength={8}
                        onChange={(event) =>
                            handleChange("newPassword", event.target.value)
                        }
                        required
                    />
                </label>

                <label className="settings-field">
                    <span>Повторите новый пароль</span>
                    <input
                        type="password"
                        value={form.newPasswordConfirmation}
                        autoComplete="new-password"
                        minLength={8}
                        onChange={(event) =>
                            handleChange(
                                "newPasswordConfirmation",
                                event.target.value
                            )
                        }
                        required
                    />
                </label>
            </div>

            <div className="admin-password-form__actions">
                <button type="submit" disabled={isSubmitDisabled}>
                    {isSaving ? "Изменяем..." : "Изменить пароль"}
                </button>

                <div aria-live="polite">
                    {successMessage ? (
                        <span className="settings-message settings-message--success">
                            {successMessage}
                        </span>
                    ) : null}

                    {errorMessage ? (
                        <span className="settings-message settings-message--error">
                            {errorMessage}
                        </span>
                    ) : null}
                </div>
            </div>
        </form>
    );
}
