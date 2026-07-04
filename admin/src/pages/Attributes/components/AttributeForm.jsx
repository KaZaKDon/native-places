export function AttributeForm({
    categories,
    fieldTypes,
    form,
    isEditing,
    isSaving = false,
    onChange,
    onSubmit,
    onCancel,
}) {
    return (
        <form className="attribute-form" onSubmit={onSubmit}>
            <div className="attribute-form__header">
                <div>
                    <p className="eyebrow">Настройка поля</p>

                    <h3>{isEditing ? "Изменить характеристику" : "Добавить характеристику"}</h3>

                    <p>
                        Характеристика определяет дополнительное поле в форме объявления:
                        цену, площадь, сезон, условия, услуги или другие параметры.
                    </p>
                </div>

                {isEditing && (
                    <button
                        className="attribute-form__cancel"
                        type="button"
                        onClick={onCancel}
                        disabled={isSaving}
                    >
                        Отменить
                    </button>
                )}
            </div>

            <div className="attribute-form__grid">
                <label className="attribute-form__field">
                    <span>Категория</span>

                    <select
                        value={form.categoryCode}
                        onChange={(event) => onChange("categoryCode", event.target.value)}
                        disabled={isSaving}
                        required
                    >
                        <option value="">Выберите категорию</option>

                        {categories.map((category) => (
                            <option key={category.code} value={category.code}>
                                {category.title}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="attribute-form__field">
                    <span>Название</span>

                    <input
                        type="text"
                        value={form.title}
                        onChange={(event) => onChange("title", event.target.value)}
                        placeholder="Например: Площадь"
                        disabled={isSaving}
                        required
                    />
                </label>

                <label className="attribute-form__field">
                    <span>Ключ</span>

                    <input
                        type="text"
                        value={form.key}
                        onChange={(event) => onChange("key", event.target.value)}
                        placeholder="Например: area"
                        disabled={isSaving}
                        required
                    />
                </label>

                <label className="attribute-form__field">
                    <span>Тип поля</span>

                    <select
                        value={form.fieldType}
                        onChange={(event) => onChange("fieldType", event.target.value)}
                        disabled={isSaving}
                        required
                    >
                        <option value="">Выберите тип поля</option>

                        {fieldTypes.map((fieldType) => (
                            <option key={fieldType.value} value={fieldType.value}>
                                {fieldType.title}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="attribute-form__checkbox">
                    <input
                        type="checkbox"
                        checked={form.isRequired}
                        onChange={(event) => onChange("isRequired", event.target.checked)}
                        disabled={isSaving}
                    />

                    <span>Обязательное поле</span>
                </label>
            </div>

            <button
                className="attribute-form__submit"
                type="submit"
                disabled={isSaving}
            >
                {isSaving
                    ? "Сохраняем..."
                    : isEditing
                        ? "Сохранить изменения"
                        : "Добавить характеристику"}
            </button>
        </form>
    );
}