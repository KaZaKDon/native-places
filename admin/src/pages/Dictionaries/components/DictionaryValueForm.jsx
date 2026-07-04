export function DictionaryValueForm({
    selectedGroup,
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
                    <p className="eyebrow">Значение справочника</p>
                    <h3>
                        {isEditing ? "Изменить значение" : "Добавить значение"}
                    </h3>
                    <p>
                        {selectedGroup
                            ? `Текущее значение будет добавлено в справочник «${selectedGroup.title}».`
                            : "Сначала откройте справочник из таблицы выше."}
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
                    <span>Значение</span>
                    <input
                        type="text"
                        value={form.title}
                        onChange={(event) => onChange("title", event.target.value)}
                        placeholder="Например: Щука"
                        required
                        disabled={!selectedGroup}
                    />
                </label>

                <label className="dictionary-form__field">
                    <span>Код</span>
                    <input
                        type="text"
                        value={form.code}
                        onChange={(event) => onChange("code", event.target.value)}
                        placeholder="Например: pike"
                        required
                        disabled={!selectedGroup}
                    />
                </label>
            </div>

            <button
                className="dictionary-form__submit"
                type="submit"
                disabled={!selectedGroup}
            >
                {isEditing ? "Сохранить значение" : "Добавить значение"}
            </button>
        </form>
    );
}