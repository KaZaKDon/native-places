import { EmptyState } from "../EmptyState/EmptyState";
import { canAccessByRole } from "../../utils/access";
import { useAdminAuth } from "../../context/useAdminAuth";

export function RequireRole({ roles, children }) {
    const {
        role,
        isLoading,
    } = useAdminAuth();

    if (isLoading) {
        return (
            <EmptyState>
                Проверяем права доступа...
            </EmptyState>
        );
    }

    if (!canAccessByRole(roles, role)) {
        return (
            <section className="page">
                <EmptyState>
                    Недостаточно прав для просмотра этого раздела.
                </EmptyState>
            </section>
        );
    }

    return children;
}