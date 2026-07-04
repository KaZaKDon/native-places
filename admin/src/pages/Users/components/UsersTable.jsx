import { Link } from "react-router-dom";

import { StatusBadge } from "../../../components/StatusBadge/StatusBadge";
import { roleLabels } from "../../../config/roles";

export function UsersTable({ users }) {
    if (!users.length) {
        return (
            <div className="users-empty">
                Пользователей в этом разделе пока нет.
            </div>
        );
    }

    return (
        <div className="users-table-wrap">
            <table className="users-table">
                <thead>
                    <tr>
                        <th>Пользователь</th>
                        <th>Email</th>
                        <th>Телефон</th>
                        <th>Роль</th>
                        <th>Статус</th>
                        <th>Объявлений</th>
                        <th>Дата регистрации</th>
                        <th>Действия</th>
                    </tr>
                </thead>

                <tbody>
                    {users.map((user) => (
                        <tr key={user.id}>
                            <td>
                                <div className="user-title-cell">
                                    <span className="user-id">#{user.id}</span>
                                    <strong>{user.name}</strong>
                                </div>
                            </td>

                            <td>{user.email || "—"}</td>
                            <td>{user.phone}</td>
                            <td>{roleLabels[user.role_code] || user.role_title || "—"}</td>

                            <td>
                                <StatusBadge status={user.status} />
                            </td>

                            <td>{user.places_count}</td>
                            <td>{user.created_at || "—"}</td>

                            <td>
                                <Link
                                    className="table-action"
                                    to={`/users/view/${user.id}`}
                                >
                                    Открыть
                                </Link>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}