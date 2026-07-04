import { StatusTabs } from "../../../components/StatusTabs/StatusTabs";

export function PaymentsStatusTabs({ items }) {
    return (
        <StatusTabs
            items={items}
            basePath="/payments"
            className="payments-status-tabs"
            itemClassName="payments-status-tab"
        />
    );
}