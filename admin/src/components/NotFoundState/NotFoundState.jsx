import { BackButton } from "../BackButton/BackButton";

export function NotFoundState({ eyebrow, title, description }) {
    return (
        <section className="page">
            <BackButton />

            <div className="page-header">
                <div>
                    {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}

                    <h2>{title}</h2>

                    {description ? <p>{description}</p> : null}
                </div>
            </div>
        </section>
    );
}