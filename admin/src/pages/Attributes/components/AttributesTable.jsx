import { EmptyState } from "../../../components/EmptyState/EmptyState";

export function AttributesTable({ attributes, onEdit, onDelete }) {
    if (!attributes.length) {
        return (
            <EmptyState className="attributes-empty">
                Характеристик пока нет. Добавьте первое поле через форму ниже.
            </EmptyState>
        );
    }

    return (
        <div className="attributes-table-wrap">
            <table className="attributes-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Категория</th>
                        <th>Название</th>
                        <th>Ключ</th>
                        <th>Тип поля</th>
                        <th>Обязательное</th>
                        <th>Действия</th>
                    </tr>
                </thead>

                <tbody>
                    {attributes.map((attribute) => (
                        <tr key={attribute.id}>
                            <td>
                                <span className="attribute-id">#{attribute.id}</span>
                            </td>

                            <td>
                                <span className="attribute-category">
                                    {attribute.categoryTitle}
                                </span>
                            </td>

                            <td>
                                <strong>{attribute.title}</strong>
                            </td>

                            <td>
                                <code className="attribute-key">{attribute.key}</code>
                            </td>

                            <td>{attribute.fieldTypeTitle}</td>

                            <td>
                                <span
                                    className={
                                        attribute.isRequired
                                            ? "attribute-required attribute-required--yes"
                                            : "attribute-required"
                                    }
                                >
                                    {attribute.isRequired ? "Да" : "Нет"}
                                </span>
                            </td>

                            <td>
                                <div className="attributes-table-actions">
                                    <button
                                        className="table-action"
                                        type="button"
                                        onClick={() => onEdit(attribute)}
                                    >
                                        Изменить
                                    </button>

                                    <button
                                        className="table-action table-action--danger"
                                        type="button"
                                        onClick={() => onDelete(attribute)}
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
    );
}