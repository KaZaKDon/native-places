export function DictionaryGroupForm({
    form,
    isEditing,
    onChange,
    onSubmit,
    onCancel,
}) {
    return (
        <form className="dictionary-form" onSubmit={onSubmit}>
            <div className="dictionary-form__header">
                <div>
                    <p className="eyebrow">Группа справочника</p>
                    <h3>{isEditing ? "Изменить справочник" : "Добавить справочник"}</h3>
                    <p>
                        Группа объединяет значения одного типа: виды рыб, услуги,
                        материалы стен, отопление или другие повторяющиеся списки.
                    </p>
                </div>

                {isEditing && (
                    <button
                        className="dictionary-form__cancel"
                        type="button"
                        onClick={onCancel}
                    >
                        Отменить
                    </button>
                )}
            </div>

            <div className="dictionary-form__grid">
                <label className="dictionary-form__field">
                    <span>Название</span>
                    <input
                        type="text"
                        value={form.title}
                        onChange={(event) => onChange("title", event.target.value)}
                        placeholder="Например: Виды рыб"
                        required
                    />
                </label>

                <label className="dictionary-form__field">
                    <span>Код</span>
                    <input
                        type="text"
                        value={form.code}
                        onChange={(event) => onChange("code", event.target.value)}
                        placeholder="Например: fish_species"
                        required
                    />
                </label>
            </div>

            <button className="dictionary-form__submit" type="submit">
                {isEditing ? "Сохранить изменения" : "Добавить справочник"}
            </button>
        </form>
    );
}