export function PlanForm({
    form,
    statusItems,
    isEditing,
    isSaving = false,
    onChange,
    onSubmit,
    onCancel,
}) {
    return (
        <form className="plan-form" onSubmit={onSubmit}>
            <div className="plan-form__header">
                <div>
                    <p className="eyebrow">Тарифный план</p>

                    <h3>{isEditing ? "Изменить тариф" : "Добавить тариф"}</h3>

                    <p>
                        Тариф определяет стоимость размещения, срок публикации и лимит
                        объявлений для пользователя.
                    </p>
                </div>

                {isEditing && (
                    <button
                        className="plan-form__cancel"
                        type="button"
                        onClick={onCancel}
                        disabled={isSaving}
                    >
                        Отменить
                    </button>
                )}
            </div>

            <div className="plan-form__grid">
                <label className="plan-form__field">
                    <span>Название</span>

                    <input
                        type="text"
                        value={form.title}
                        onChange={(event) => onChange("title", event.target.value)}
                        placeholder="Например: Realtor"
                        disabled={isSaving}
                        required
                    />
                </label>

                <label className="plan-form__field">
                    <span>Код</span>

                    <input
                        type="text"
                        value={form.code}
                        onChange={(event) => onChange("code", event.target.value)}
                        placeholder="Например: realtor"
                        disabled={isSaving}
                        required
                    />
                </label>

                <label className="plan-form__field">
                    <span>Цена, ₽</span>

                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.price}
                        onChange={(event) => onChange("price", event.target.value)}
                        placeholder="1500"
                        disabled={isSaving}
                        required
                    />
                </label>

                <label className="plan-form__field">
                    <span>Срок, дней</span>

                    <input
                        type="number"
                        min="1"
                        value={form.durationDays}
                        onChange={(event) => onChange("durationDays", event.target.value)}
                        placeholder="30"
                        disabled={isSaving}
                        required
                    />
                </label>

                <label className="plan-form__field">
                    <span>Лимит объявлений</span>

                    <input
                        type="number"
                        min="0"
                        value={form.placesLimit}
                        onChange={(event) => onChange("placesLimit", event.target.value)}
                        placeholder="30"
                        disabled={isSaving}
                        required
                    />
                </label>

                <label className="plan-form__field">
                    <span>Статус</span>

                    <select
                        value={form.status}
                        onChange={(event) => onChange("status", event.target.value)}
                        disabled={isSaving}
                        required
                    >
                        {statusItems.map((status) => (
                            <option key={status.value} value={status.value}>
                                {status.title}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="plan-form__field plan-form__field--wide">
                    <span>Описание</span>

                    <textarea
                        value={form.description}
                        onChange={(event) => onChange("description", event.target.value)}
                        placeholder="Коротко опишите условия тарифа"
                        rows="4"
                        disabled={isSaving}
                    />
                </label>
            </div>

            <button
                className="plan-form__submit"
                type="submit"
                disabled={isSaving}
            >
                {isSaving
                    ? "Сохраняем..."
                    : isEditing
                        ? "Сохранить изменения"
                        : "Добавить тариф"}
            </button>
        </form>
    );
}