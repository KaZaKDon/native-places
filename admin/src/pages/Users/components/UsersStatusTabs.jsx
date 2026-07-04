import { StatusTabs } from "../../../components/StatusTabs/StatusTabs";

export function UsersStatusTabs({ items }) {
    return (
        <StatusTabs
            items={items}
            basePath="/users"
            className="users-status-tabs"
            itemClassName="users-status-tab"
        />
    );
}