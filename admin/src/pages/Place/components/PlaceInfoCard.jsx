import { InfoCard } from "../../../components/InfoCard/InfoCard";

export function PlaceInfoCard({ title, items, action }) {
    return (
        <InfoCard
            title={title}
            items={items}
            action={action}
            sectionClassName="place-section"
            headerClassName="place-section__header"
            listClassName="place-info-list"
        />
    );
}