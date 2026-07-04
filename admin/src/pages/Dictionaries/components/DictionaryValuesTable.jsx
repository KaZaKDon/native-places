import { EmptyState } from "../../../components/EmptyState/EmptyState";

export function DictionaryValuesTable({ selectedGroup, values, onEdit, onDelete }) {
    if (!selectedGroup) {
        return (
            <EmptyState className="dictionaries-empty">
                Выберите справочник, чтобы увидеть его значения.
            </EmptyState>
        );
    }

    return (
        <div className="dictionary-values-section">
            <div className="dictionary-values-section__header">
                <div>
                    <p className="eyebrow">Значения справочника</p>
                    <h3>{selectedGroup.title}</h3>
                    <p>
                        Код справочника:{" "}
                        <code className="dictionary-code">{selectedGroup.code}</code>
                    </p>
                </div>

                <span className="dictionary-values-count">
                    Значений: {values.length}
                </span>
            </div>

            {!values.length ? (
                <EmptyState className="dictionaries-empty">
                    В выбранном справочнике пока нет значений.
                </EmptyState>
            ) : (
                <div className="dictionary-values-table-wrap">
                    <table className="dictionary-values-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Значение</th>
                                <th>Код</th>
                                <th>Действия</th>
                            </tr>
                        </thead>

                        <tbody>
                            {values.map((value) => (
                                <tr key={value.id}>
                                    <td>
                                        <span className="dictionary-id">#{value.id}</span>
                                    </td>

                                    <td>
                                        <strong>{value.title}</strong>
                                    </td>

                                    <td>
                                        <code className="dictionary-code">{value.code}</code>
                                    </td>
                                    
                                    <td>
                                        <div className="dictionaries-table-actions">
                                            <button
                                                className="table-action"
                                                type="button"
                                                onClick={() => onEdit(value)}
                                            >
                                                Изменить
                                            </button>

                                            <button
                                                className="table-action table-action--danger"
                                                type="button"
                                                onClick={() => onDelete(value)}
                                            >
                                                Удалить
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}