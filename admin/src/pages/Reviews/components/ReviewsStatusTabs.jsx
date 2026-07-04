import { StatusTabs } from "../../../components/StatusTabs/StatusTabs";

export function ReviewsStatusTabs({ items }) {
    return (
        <StatusTabs
            items={items}
            basePath="/reviews"
            className="reviews-status-tabs"
            itemClassName="reviews-status-tab"
        />
    );
}