import { Link } from "react-router-dom";

export function InfoCard({
    title,
    items,
    action,
    sectionClassName,
    headerClassName,
    listClassName,
}) {
    return (
        <article className={sectionClassName}>
            <div className={headerClassName}>
                <h3>{title}</h3>

                {action ? (
                    <Link className="table-action" to={action.to}>
                        {action.label}
                    </Link>
                ) : null}
            </div>

            <div className={listClassName}>
                {items.map((item) => (
                    <div key={item.label}>
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                    </div>
                ))}
            </div>
        </article>
    );
}