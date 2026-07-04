export function CategoryForm({
    form,
    isEditing,
    isSaving = false,
    onChange,
    onSubmit,
    onCancel,
}) {
    return (
        <form className="category-form" onSubmit={onSubmit}>
            <div className="category-form__header">
                <div>
                    <p className="eyebrow">Справочник</p>

                    <h3>{isEditing ? "Изменить категорию" : "Добавить категорию"}</h3>

                    <p>
                        Категория используется для группировки объявлений на сайте и в
                        административной панели.
                    </p>
                </div>

                {isEditing && (
                    <button
                        className="category-form__cancel"
                        type="button"
                        onClick={onCancel}
                        disabled={isSaving}
                    >
                        Отменить
                    </button>
                )}
            </div>

            <div className="category-form__grid">
                <label className="category-form__field">
                    <span>Название</span>

                    <input
                        type="text"
                        value={form.title}
                        onChange={(event) => onChange("title", event.target.value)}
                        placeholder="Например: Рыбалка"
                        disabled={isSaving}
                        required
                    />
                </label>

                <label className="category-form__field">
                    <span>Код</span>

                    <input
                        type="text"
                        value={form.code}
                        onChange={(event) => onChange("code", event.target.value)}
                        placeholder="Например: fishing"
                        disabled={isSaving}
                        required
                    />
                </label>

                <label className="category-form__field category-form__field--wide">
                    <span>Описание</span>

                    <textarea
                        value={form.description}
                        onChange={(event) => onChange("description", event.target.value)}
                        placeholder="Коротко опишите, какие объявления относятся к этой категории"
                        rows="4"
                        disabled={isSaving}
                        required
                    />
                </label>
            </div>

            <button
                className="category-form__submit"
                type="submit"
                disabled={isSaving}
            >
                {isSaving
                    ? "Сохраняем..."
                    : isEditing
                        ? "Сохранить изменения"
                        : "Добавить категорию"}
            </button>
        </form>
    );
}