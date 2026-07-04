import { StatusTabs } from "../../../components/StatusTabs/StatusTabs";

export function PlacesStatusTabs({ items }) {
    return (
        <StatusTabs
            items={items}
            basePath="/places"
            className="places-status-tabs"
            itemClassName="places-status-tab"
        />
    );
}