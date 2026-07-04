import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "../../components/EmptyState/EmptyState";
import { adminSettingsApi } from "../../shared/api/adminSettingsApi";
import { SettingsGroup } from "./components/SettingsGroup";

import "./SettingsPage.css";

function createValuesFromGroups(groups) {
    return groups.reduce((acc, group) => {
        group.items.forEach((setting) => {
            acc[setting.key] = setting.value;
        });

        return acc;
    }, {});
}

export function SettingsPage() {
    const [groups, setGroups] = useState([]);
    const [values, setValues] = useState({});
    const [initialValues, setInitialValues] = useState({});

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const hasChanges = useMemo(() => (
        JSON.stringify(values) !== JSON.stringify(initialValues)
    ), [values, initialValues]);

    useEffect(() => {
        let isMounted = true;

        async function loadSettings() {
            try {
                setIsLoading(true);
                setErrorMessage("");

                const data = await adminSettingsApi.getSettings();
                const nextGroups = data.groups || [];
                const nextValues = createValuesFromGroups(nextGroups);

                if (!isMounted) {
                    return;
                }

                setGroups(nextGroups);
                setValues(nextValues);
                setInitialValues(nextValues);
            } catch (error) {
                if (!isMounted) {
                    return;
                }

                setErrorMessage(
                    error?.message || "Не удалось загрузить настройки сайта"
                );
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        loadSettings();

        return () => {
            isMounted = false;
        };
    }, []);

    function handleChange(key, value) {
        setValues((currentValues) => ({
            ...currentValues,
            [key]: value,
        }));

        setSuccessMessage("");
    }

    function handleReset() {
        setValues(initialValues);
        setSuccessMessage("");
        setErrorMessage("");
    }

    async function handleSubmit(event) {
        event.preventDefault();

        try {
            setIsSaving(true);
            setErrorMessage("");
            setSuccessMessage("");

            await adminSettingsApi.updateSettings(values);

            setInitialValues(values);
            setSuccessMessage("Настройки успешно сохранены");
        } catch (error) {
            setErrorMessage(
                error?.message || "Не удалось сохранить настройки сайта"
            );
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <section className="page settings-page">
            <div className="page-header">
                <div>
                    <p className="eyebrow">Настройки сайта</p>
                    <h2>Системные настройки Native Places</h2>
                    <p>
                        Управление общими параметрами сайта, публикацией объявлений,
                        модерацией, контактами и реквизитами оплаты.
                    </p>
                </div>

                <span className="status-badge">API</span>
            </div>

            {isLoading ? (
                <EmptyState className="settings-empty">
                    Загружаем настройки сайта...
                </EmptyState>
            ) : null}

            {!isLoading && errorMessage ? (
                <EmptyState className="settings-empty settings-empty--error">
                    {errorMessage}
                </EmptyState>
            ) : null}

            {!isLoading && !errorMessage && !groups.length ? (
                <EmptyState className="settings-empty">
                    Настройки сайта пока не найдены.
                </EmptyState>
            ) : null}

            {!isLoading && !errorMessage && groups.length > 0 ? (
                <form className="settings-form" onSubmit={handleSubmit}>
                    <div className="settings-groups">
                        {groups.map((group) => (
                            <SettingsGroup
                                key={group.code}
                                group={group}
                                values={values}
                                onChange={handleChange}
                            />
                        ))}
                    </div>

                    <div className="settings-actions">
                        <button
                            className="settings-actions__submit"
                            type="submit"
                            disabled={!hasChanges || isSaving}
                        >
                            {isSaving ? "Сохраняем..." : "Сохранить настройки"}
                        </button>

                        <button
                            className="settings-actions__reset"
                            type="button"
                            onClick={handleReset}
                            disabled={!hasChanges || isSaving}
                        >
                            Сбросить изменения
                        </button>

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
                </form>
            ) : null}
        </section>
    );
}