import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link, useLocation, useParams } from "react-router-dom";

import {
    getLegalDocumentsForContext,
    legalDocumentsBySlug,
} from "../content/legal/legalDocuments";
import { Seo } from "../shared/seo/Seo";
import { NOINDEX_ROBOTS } from "../shared/seo/seoConfig";

import "./LegalPage.css";

function getBackPath(state) {
    const path = state?.from;

    return typeof path === "string" && path.startsWith("/") ? path : "/";
}

function getRelatedDocuments(document) {
    const related = new Map();

    document.contexts.forEach((context) => {
        getLegalDocumentsForContext(context).forEach((item) => {
            if (item.slug !== document.slug && !item.draft) {
                related.set(item.slug, item);
            }
        });
    });

    return Array.from(related.values()).slice(0, 5);
}

function MarkdownLink({ href = "", children }) {
    if (href.startsWith("/")) {
        return <Link to={href}>{children}</Link>;
    }

    const isExternal = /^https?:\/\//i.test(href);

    return (
        <a
            href={href}
            rel={isExternal ? "noreferrer" : undefined}
            target={isExternal ? "_blank" : undefined}
        >
            {children}
        </a>
    );
}

export function LegalPage() {
    const location = useLocation();
    const { documentSlug = "" } = useParams();
    const document = legalDocumentsBySlug[documentSlug];
    const backPath = getBackPath(location.state);

    if (!document) {
        return (
            <>
                <Seo
                    title="Документ не найден | Native Places"
                    description="Запрошенный документ Native Places не найден."
                    canonical={`/legal/${documentSlug}`}
                    robots={NOINDEX_ROBOTS}
                />
                <main className="legal-page">
                    <section className="legal-card legal-card--missing">
                        <h1>Документ не найден</h1>
                        <p>Проверьте адрес страницы или вернитесь к предыдущему разделу.</p>
                        <Link className="legal-card__button legal-card__button--primary" to={backPath}>
                            Вернуться назад
                        </Link>
                    </section>
                </main>
            </>
        );
    }

    const relatedDocuments = getRelatedDocuments(document);

    return (
        <>
            <Seo
                title={`${document.title} | Native Places`}
                description={`${document.title} Native Places. Версия ${document.version}.`}
                canonical={`https://native-places.ru${document.path}`}
                robots={document.robots}
            />

            <main className="legal-page">
                <article className="legal-card">
                    <div className="legal-card__meta">
                        <span>Native Places</span>
                        <span>Версия {document.version}</span>
                    </div>

                    <div className="legal-card__notice" role="note">
                        <strong>{document.draft ? "Проект платной оферты." : "Рабочая редакция."}</strong>{" "}
                        Документ пока не вступил в силу: необходимо заполнить реквизиты владельца
                        и провести финальную проверку юристом.
                    </div>

                    <div className="legal-card__markdown">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            skipHtml
                            components={{ a: MarkdownLink }}
                        >
                            {document.content}
                        </ReactMarkdown>
                    </div>

                    {relatedDocuments.length > 0 && (
                        <nav className="legal-card__related" aria-label="Связанные документы">
                            <strong>Связанные документы</strong>
                            <div>
                                {relatedDocuments.map((item) => (
                                    <Link
                                        key={item.slug}
                                        to={item.path}
                                        state={{ from: backPath }}
                                    >
                                        {item.shortTitle}
                                    </Link>
                                ))}
                            </div>
                        </nav>
                    )}

                    <div className="legal-card__actions">
                        <Link
                            className="legal-card__button legal-card__button--primary"
                            to={backPath}
                        >
                            Вернуться назад
                        </Link>
                        <Link className="legal-card__button" to="/">
                            На главную
                        </Link>
                    </div>
                </article>
            </main>
        </>
    );
}
