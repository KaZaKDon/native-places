import { InfoCard } from "../../../components/InfoCard/InfoCard";

export function UserInfoCard({ title, items }) {
    return (
        <InfoCard
            title={title}
            items={items}
            sectionClassName="user-section"
            headerClassName="user-section__header"
            listClassName="user-info-list"
        />
    );
}