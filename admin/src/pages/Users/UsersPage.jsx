import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { UsersStatusTabs } from "./components/UsersStatusTabs";
import { UsersTable } from "./components/UsersTable";

import { usersApi } from "../../shared/api/usersApi";

import { filterUsers, mapUserFromApi } from "./utils/usersFilters";

import "./UsersPage.css";

export function UsersPage() {
    const { status } = useParams();

    const currentStatus = status || "all";

    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        let isMounted = true;

        async function loadUsers() {
            try {
                setIsLoading(true);
                setErrorMessage("");

                const data = await usersApi.getUsers();
                const mappedUsers = (data.users || []).map(mapUserFromApi);

                if (isMounted) {
                    setUsers(mappedUsers);
                }
            } catch (error) {
                if (isMounted) {
                    setErrorMessage(error.message || "Не удалось загрузить пользователей");
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        loadUsers();

        return () => {
            isMounted = false;
        };
    }, []);

    const statusItems = useMemo(() => {
        return [
            {
                value: "all",
                label: "Все",
                count: users.length,
            },
            {
                value: "active",
                label: "Активные",
                count: users.filter((user) => user.status === "active").length,
            },
            {
                value: "blocked",
                label: "Заблокированные",
                count: users.filter((user) => user.status === "blocked").length,
            },
            {
                value: "moderator",
                label: "Модераторы",
                count: users.filter((user) => user.role_code === "moderator").length,
            },
            {
                value: "admin",
                label: "Администраторы",
                count: users.filter((user) => user.role_code === "admin").length,
            },
        ];
    }, [users]);

    const filteredUsers = useMemo(() => {
        return filterUsers(users, currentStatus);
    }, [users, currentStatus]);

    return (
        <section className="page">
            <div className="page-header">
                <div>
                    <p className="eyebrow">Пользователи</p>

                    <h2>Управление пользователями</h2>

                    <p>
                        Реальные пользователи, роли, статусы и количество объявлений.
                    </p>
                </div>
            </div>

            {errorMessage ? (
                <div className="users-empty">
                    {errorMessage}
                </div>
            ) : null}

            {isLoading ? (
                <div className="users-empty">
                    Загружаем пользователей...
                </div>
            ) : (
                <>
                    <UsersStatusTabs items={statusItems} />

                    <UsersTable users={filteredUsers} />
                </>
            )}
        </section>
    );
}