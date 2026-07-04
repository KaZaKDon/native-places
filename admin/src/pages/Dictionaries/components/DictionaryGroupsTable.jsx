import { EmptyState } from "../../../components/EmptyState/EmptyState";

export function DictionaryGroupsTable({
    groups,
    selectedGroupId,
    onOpen,
    onEdit,
    onDelete,
}) {
    if (!groups.length) {
        return (
            <EmptyState className="dictionaries-empty">
                Справочников пока нет. Добавьте первый справочник через форму ниже.
            </EmptyState>
        );
    }

    return (
        <div className="dictionaries-table-wrap">
            <table className="dictionaries-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Название</th>
                        <th>Код</th>
                        <th>Значений</th>
                        <th>Используется в характеристиках</th>
                        <th>Действия</th>
                    </tr>
                </thead>

                <tbody>
                    {groups.map((group) => {
                        const canDelete = group.usedInAttributes.length === 0;
                        const isSelected = group.id === selectedGroupId;

                        return (
                            <tr
                                className={isSelected ? "dictionary-row--selected" : ""}
                                key={group.id}
                            >
                                <td>
                                    <span className="dictionary-id">#{group.id}</span>
                                </td>

                                <td>
                                    <strong>{group.title}</strong>
                                </td>

                                <td>
                                    <code className="dictionary-code">{group.code}</code>
                                </td>

                                <td>{group.valuesCount}</td>

                                <td>
                                    {group.usedInAttributes.length > 0 ? (
                                        <div className="dictionary-used-list">
                                            {group.usedInAttributes.map((attribute) => (
                                                <span key={attribute}>{attribute}</span>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="dictionary-muted">Не используется</span>
                                    )}
                                </td>

                                <td>
                                    <div className="dictionaries-table-actions">
                                        <button
                                            className="table-action"
                                            type="button"
                                            onClick={() => onOpen(group)}
                                        >
                                            Открыть
                                        </button>

                                        <button
                                            className="table-action"
                                            type="button"
                                            onClick={() => onEdit(group)}
                                        >
                                            Изменить
                                        </button>

                                        <button
                                            className="table-action table-action--danger"
                                            type="button"
                                            onClick={() => onDelete(group)}
                                            disabled={!canDelete}
                                            title={
                                                canDelete
                                                    ? "Удалить справочник"
                                                    : "Нельзя удалить справочник, который используется в характеристиках"
                                            }
                                        >
                                            Удалить
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}