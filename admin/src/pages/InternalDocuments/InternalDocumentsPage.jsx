import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import accessAndModeration from "../../content/internal-legal/11_INTERNAL_ACCESS_AND_MODERATION.md?raw";
import retentionAndBackup from "../../content/internal-legal/12_INTERNAL_RETENTION_AND_BACKUP.md?raw";
import { useAdminAuth } from "../../context/useAdminAuth";

import "./InternalDocumentsPage.css";

const DOCUMENTS = {
    moderation: {
        title: "Доступ и модерация",
        content: accessAndModeration,
        roles: ["admin", "moderator"],
    },
    retention: {
        title: "Хранение и резервное копирование",
        content: retentionAndBackup,
        roles: ["admin"],
    },
};

export function InternalDocumentsPage() {
    const { role } = useAdminAuth();
    const availableDocuments = useMemo(
        () => Object.entries(DOCUMENTS).filter(([, document]) => document.roles.includes(role)),
        [role]
    );
    const [activeDocument, setActiveDocument] = useState("moderation");
    const currentDocument = DOCUMENTS[activeDocument] || availableDocuments[0]?.[1];

    return (
        <section className="internal-documents-page">
            <header>
                <p>Только для сотрудников Native Places</p>
                <h2>Внутренние регламенты</h2>
                <span>
                    Документы доступны только после входа и с учётом роли сотрудника.
                </span>
            </header>

            <nav aria-label="Внутренние документы">
                {availableDocuments.map(([code, document]) => (
                    <button
                        key={code}
                        type="button"
                        className={activeDocument === code ? "is-active" : ""}
                        onClick={() => setActiveDocument(code)}
                    >
                        {document.title}
                    </button>
                ))}
            </nav>

            {currentDocument && (
                <article>
                    <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
                        {currentDocument.content}
                    </ReactMarkdown>
                </article>
            )}
        </section>
    );
}
