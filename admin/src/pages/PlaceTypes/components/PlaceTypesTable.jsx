import { EmptyState } from "../../../components/EmptyState/EmptyState";

export function PlaceTypesTable({ placeTypes, onEdit, onToggleActive }) {
    if (!placeTypes.length) {
        return (
            <EmptyState className="place-types-empty">
                Типов объектов пока нет. Добавьте первый тип через форму ниже.
            </EmptyState>
        );
    }

    return (
        <div className="place-types-table-wrap">
            <table className="place-types-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Категория</th>
                        <th>Название</th>
                        <th>Код</th>
                        <th>Объявлений</th>
                        <th>Статус</th>
                        <th>Действия</th>
                    </tr>
                </thead>

                <tbody>
                    {placeTypes.map((type) => {
                        const canDelete = type.placesCount === 0;

                        return (
                            <tr key={type.id}>
                                <td>
                                    <span className="place-type-id">#{type.id}</span>
                                </td>

                                <td>
                                    <span className="place-type-category">
                                        {type.categoryTitle}
                                    </span>
                                </td>

                                <td>
                                    <strong>{type.title}</strong>
                                </td>

                                <td>
                                    <code className="place-type-code">{type.code}</code>
                                </td>

                                <td>{type.placesCount}</td>

                                <td>{type.isActive ? "Активен" : "Отключён"}</td>

                                <td>
                                    <div className="place-types-table-actions">
                                        <button
                                            className="table-action"
                                            type="button"
                                            onClick={() => onEdit(type)}
                                        >
                                            Изменить
                                        </button>

                                        <button
                                            className="table-action table-action--danger"
                                            type="button"
                                            onClick={() => onToggleActive(type)}
                                            disabled={type.isActive && !canDelete}
                                            title={
                                                type.isActive && !canDelete
                                                    ? "Нельзя отключить тип объекта с объявлениями"
                                                    : type.isActive
                                                        ? "Отключить тип объекта"
                                                        : "Включить тип объекта"
                                            }
                                        >
                                            {type.isActive ? "Отключить" : "Включить"}
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