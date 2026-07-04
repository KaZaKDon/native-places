import { useMemo, useState } from "react";

import { mailingsApi } from "../../../shared/api/mailingsApi";

const initialForm = {
    subject: "",
    body: "",
    audience_type: "all",
    audience_value: "",
};

function getAudienceValues(options, audienceType) {
    if (audienceType === "category") {
        return options.categories || [];
    }

    if (audienceType === "plan") {
        return options.plans || [];
    }

    if (audienceType === "role") {
        return options.roles || [];
    }

    return [];
}

function getSelectedAudienceType(options, audienceType) {
    return options.audience_types.find((item) => item.value === audienceType);
}

export function MailingForm({ options, onCreated }) {
    const [form, setForm] = useState(initialForm);
    const [recipientsCount, setRecipientsCount] = useState(null);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [message, setMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const selectedAudienceType = useMemo(
        () => getSelectedAudienceType(options, form.audience_type),
        [options, form.audience_type]
    );

    const audienceValues = useMemo(
        () => getAudienceValues(options, form.audience_type),
        [options, form.audience_type]
    );

    const needsAudienceValue = Boolean(selectedAudienceType?.requires_value);

    function handleChange(field, value) {
        setForm((currentForm) => ({
            ...currentForm,
            [field]: value,
            ...(field === "audience_type" ? { audience_value: "" } : {}),
        }));

        setRecipientsCount(null);
        setMessage("");
        setErrorMessage("");
    }

    async function handlePreview() {
        try {
            setIsPreviewLoading(true);
            setErrorMessage("");
            setMessage("");

            const data = await mailingsApi.previewAudience({
                audience_type: form.audience_type,
                audience_value: form.audience_value,
            });

            setRecipientsCount(data.recipients_count);
        } catch (error) {
            setErrorMessage(
                error.message || "Не удалось рассчитать получателей"
            );
        } finally {
            setIsPreviewLoading(false);
        }
    }
async function handleSubmit(event) {
    event.preventDefault();

    try {
        setIsCreating(true);
        setErrorMessage("");
        setMessage("");

        await mailingsApi.createMailing(form);

        setForm(initialForm);
        setRecipientsCount(null);
        setMessage("Рассылка создана как черновик");

        await onCreated();
    } catch (error) {
        setErrorMessage(
            error.message || "Не удалось создать рассылку"
        );
    } finally {
        setIsCreating(false);
    }
}

    return (
        <form className="mailing-form" onSubmit={handleSubmit}>
            <div className="mailing-form__header">
                <div>
                    <p className="eyebrow">Новая рассылка</p>
                    <h3>Создать email-рассылку</h3>
                    <p>
                        Выберите аудиторию, проверьте количество получателей и
                        сохраните рассылку в истории.
                    </p>
                </div>
            </div>

            <div className="mailing-form__grid">
                <label className="mailing-form__field">
                    <span>Тема</span>
                    <input
                        type="text"
                        value={form.subject}
                        onChange={(event) =>
                            handleChange("subject", event.target.value)
                        }
                        placeholder="Например: Новые возможности Native Places"
                        required
                    />
                </label>

                <label className="mailing-form__field">
                    <span>Кому отправлять</span>
                    <select
                        value={form.audience_type}
                        onChange={(event) =>
                            handleChange("audience_type", event.target.value)
                        }
                    >
                        {options.audience_types.map((type) => (
                            <option key={type.value} value={type.value}>
                                {type.title}
                            </option>
                        ))}
                    </select>
                </label>

                {needsAudienceValue ? (
                    <label className="mailing-form__field">
                        <span>Значение аудитории</span>
                        <select
                            value={form.audience_value}
                            onChange={(event) =>
                                handleChange("audience_value", event.target.value)
                            }
                            required
                        >
                            <option value="">Выберите значение</option>

                            {audienceValues.map((item) => (
                                <option key={item.code} value={item.code}>
                                    {item.title}
                                </option>
                            ))}
                        </select>
                    </label>
                ) : null}

                <label className="mailing-form__field mailing-form__field--wide">
                    <span>Текст письма</span>
                    <textarea
                        rows={7}
                        value={form.body}
                        onChange={(event) =>
                            handleChange("body", event.target.value)
                        }
                        placeholder="Введите текст рассылки"
                        required
                    />
                </label>
            </div>

            <div className="mailing-form__footer">
                <button
                    className="mailing-form__secondary"
                    type="button"
                    onClick={handlePreview}
                    disabled={isPreviewLoading}
                >
                    {isPreviewLoading ? "Считаем..." : "Посчитать получателей"}
                </button>

                <button
                    className="mailing-form__submit"
                    type="submit"
                    disabled={isCreating}
                >
                    {isCreating ? "Создаём..." : "Создать рассылку"}
                </button>

                {recipientsCount !== null ? (
                    <span className="mailing-form__count">
                        Получателей: {recipientsCount}
                    </span>
                ) : null}

                {message ? (
                    <span className="mailing-form__message">
                        {message}
                    </span>
                ) : null}

                {errorMessage ? (
                    <span className="mailing-form__error">
                        {errorMessage}
                    </span>
                ) : null}
            </div>
        </form>
    );
}