export function PlaceAttributes({ attributes }) {
    return (
        <div className="place-attributes">
            {attributes.map((item) => (
                <div
                    key={item.title}
                    className="place-attribute"
                >
                    <span>{item.title}</span>

                    <strong>{item.value}</strong>
                </div>
            ))}
        </div>
    );
}