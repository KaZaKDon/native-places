import { useCallback, useEffect, useState } from "react";

import { mailingsApi } from "../../shared/api/mailingsApi";

import { MailingForm } from "./components/MailingForm";
import { MailingsTable } from "./components/MailingsTable";

import "./MailingsPage.css";

export function MailingsPage() {
    const [options, setOptions] = useState(null);
    const [mailings, setMailings] = useState([]);

    const [isLoading, setIsLoading] = useState(true);
    const [isLoaded, setIsLoaded] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const loadData = useCallback(async ({ silent = false } = {}) => {
        try {
            if (!silent) {
                setIsLoading(true);
            }

            setErrorMessage("");

            const [optionsData, mailingsData] = await Promise.all([
                mailingsApi.getOptions(),
                mailingsApi.getMailings(),
            ]);

            setOptions(optionsData);
            setMailings(mailingsData.mailings || []);
            setIsLoaded(true);
        } catch (error) {
            setErrorMessage(
                error.message || "Не удалось загрузить данные рассылок"
            );
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        async function init() {
            await loadData({ silent: true });
        }

        init();
    }, [loadData]);

    async function handleCreated() {
        await loadData();
    }

    async function handleDelete(mailing) {
        const confirmed = window.confirm(
            `Удалить черновик рассылки «${mailing.subject}»?`
        );

        if (!confirmed) {
            return;
        }

        try {
            setIsLoading(true);
            setErrorMessage("");

            await mailingsApi.deleteMailing(mailing.id);

            await loadData({ silent: true });
        } catch (error) {
            setErrorMessage(
                error.message || "Не удалось удалить рассылку"
            );
            setIsLoading(false);
        }
    }

    return (
        <section className="page">
            <div className="page-header">
                <div>
                    <p className="eyebrow">Рассылки</p>

                    <h2>Email-рассылки пользователям</h2>

                    <p>
                        Создание и управление рассылками Native Places.
                    </p>
                </div>

                <button
                    className="mailings-load-button"
                    type="button"
                    onClick={() => loadData()}
                    disabled={isLoading}
                >
                    {isLoading ? "Обновляем..." : "Обновить"}
                </button>
            </div>

            {errorMessage ? (
                <div className="mailings-error">
                    {errorMessage}
                </div>
            ) : null}

            {isLoaded && options ? (
                <MailingForm
                    options={options}
                    onCreated={handleCreated}
                />
            ) : null}

            {isLoaded ? (
                <MailingsTable
                    mailings={mailings}
                    isLoading={isLoading}
                    onDelete={handleDelete}
                />
            ) : null}

            {!isLoaded && isLoading ? (
                <MailingsTable
                    mailings={[]}
                    isLoading={isLoading}
                    onDelete={handleDelete}
                />
            ) : null}
        </section>
    );
}
