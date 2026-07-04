import { EmptyState } from "../../../components/EmptyState/EmptyState";

export function StatisticsTable({ title, description, columns, rows }) {
    return (
        <article className="statistics-card">
            <div className="statistics-card__header">
                <div>
                    <h3>{title}</h3>
                    <p>{description}</p>
                </div>
            </div>

            {!rows.length ? (
                <EmptyState className="statistics-empty">
                    Данных пока нет.
                </EmptyState>
            ) : (
                <div className="statistics-table-wrap">
                    <table className="statistics-table">
                        <thead>
                            <tr>
                                {columns.map((column) => (
                                    <th key={column.key}>{column.label}</th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {rows.map((row) => (
                                <tr key={row.id}>
                                    {columns.map((column) => (
                                        <td key={column.key}>
                                            {row[column.key]}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </article>
    );
}