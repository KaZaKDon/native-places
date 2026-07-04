import { EmptyState } from "../../../components/EmptyState/EmptyState";

export function CategoriesTable({ categories, onEdit, onToggleActive }) {
    if (!categories.length) {
        return (
            <EmptyState className="categories-empty">
                Категорий пока нет. Добавьте первую категорию через форму ниже.
            </EmptyState>
        );
    }

    return (
        <div className="categories-table-wrap">
            <table className="categories-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Название</th>
                        <th>Код</th>
                        <th>Объявлений</th>
                        <th>Описание</th>
                        <th>Статус</th>
                        <th>Действия</th>
                    </tr>
                </thead>

                <tbody>
                    {categories.map((category) => {
                        const canDelete = category.placesCount === 0;

                        return (
                            <tr key={category.id}>
                                <td>
                                    <span className="category-id">#{category.id}</span>
                                </td>

                                <td>
                                    <strong>{category.title}</strong>
                                </td>

                                <td>
                                    <code className="category-code">{category.code}</code>
                                </td>

                                <td>{category.placesCount}</td>

                                <td>{category.description}</td>

                                <td>{category.isActive ? "Активна" : "Отключена"}</td>

                                <td>
                                    <div className="categories-table-actions">
                                        <button
                                            className="table-action"
                                            type="button"
                                            onClick={() => onEdit(category)}
                                        >
                                            Изменить
                                        </button>

                                        <button
                                            className="table-action table-action--danger"
                                            type="button"
                                            onClick={() => onToggleActive(category)}
                                            disabled={category.isActive && !canDelete}
                                            title={
                                                category.isActive && !canDelete
                                                    ? "Нельзя отключить категорию с объявлениями"
                                                    : category.isActive
                                                        ? "Отключить категорию"
                                                        : "Включить категорию"
                                            }
                                        >
                                            {category.isActive ? "Отключить" : "Включить"}
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