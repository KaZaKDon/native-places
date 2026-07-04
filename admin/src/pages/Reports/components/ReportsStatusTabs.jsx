import { StatusTabs } from "../../../components/StatusTabs/StatusTabs";

export function ReportsStatusTabs({ items }) {
    return (
        <StatusTabs
            items={items}
            basePath="/reports"
            className="reports-status-tabs"
            itemClassName="reports-status-tab"
        />
    );
}