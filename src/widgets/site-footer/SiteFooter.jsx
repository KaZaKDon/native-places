import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { publicLegalDocumentLinks } from "../../content/legal/legalDocumentLinks";

import "./SiteFooter.css";

const SITE_VERSION = "0.9";
const STUDIO_URL = "https://vkazakdon.ru";

function FooterDialog({ children, title, onClose }) {
    const titleId = useId();
    const closeButtonRef = useRef(null);

    useEffect(() => {
        const previousActiveElement = document.activeElement;
        const previousOverflow = document.body.style.overflow;

        document.body.style.overflow = "hidden";
        closeButtonRef.current?.focus();

        function handleKeyDown(event) {
            if (event.key === "Escape") {
                onClose();
            }
        }

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = previousOverflow;
            previousActiveElement?.focus?.();
        };
    }, [onClose]);

    return (
        <div
            className="site-footer-dialog"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <section
                className="site-footer-dialog__panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
            >
                <header className="site-footer-dialog__header">
                    <div>
                        <span>Native Places</span>
                        <h2 id={titleId}>{title}</h2>
                    </div>

                    <button
                        ref={closeButtonRef}
                        className="site-footer-dialog__close"
                        type="button"
                        onClick={onClose}
                        aria-label={`Закрыть окно «${title}»`}
                    >
                        ×
                    </button>
                </header>

                <div className="site-footer-dialog__content">
                    {children}
                </div>
            </section>
        </div>
    );
}

function DocumentsDialog({ onClose }) {
    return (
        <FooterDialog title="Документы" onClose={onClose}>
            <p className="site-footer-dialog__intro">
                Правила работы платформы, условия публикации и документы о
                персональных данных.
            </p>

            <nav
                className="site-footer-documents"
                aria-label="Юридические документы Native Places"
            >
                {publicLegalDocumentLinks.map((document) => (
                    <Link
                        key={document.code}
                        to={document.path}
                        onClick={onClose}
                    >
                        <span>{document.title}</span>
                        <small>Версия {document.version}</small>
                    </Link>
                ))}
            </nav>
        </FooterDialog>
    );
}

function AboutDialog({ onClose }) {
    return (
        <FooterDialog title="О платформе" onClose={onClose}>
            <div className="site-footer-about">
                <p>
                    <strong>Native Places</strong> объединяет недвижимость,
                    аренду, отдых, рыбалку, охоту и природные места на одной
                    карте.
                </p>
                <p>
                    На платформе можно публиковать объявления, сохранять
                    понравившиеся места, создавать маршруты, общаться с
                    авторами и оставлять отзывы.
                </p>
                <p>
                    Сейчас проект работает в стартовом режиме: публикация
                    объявлений доступна бесплатно, а платные услуги отключены.
                </p>
                <p className="site-footer-about__studio">
                    Проект разработан студией{" "}
                    <a href={STUDIO_URL} target="_blank" rel="noreferrer">
                        VKazakDon Studio
                    </a>
                    .
                </p>
            </div>
        </FooterDialog>
    );
}

export function SiteFooter() {
    const location = useLocation();
    const [activeDialog, setActiveDialog] = useState(null);

    const isMapInterface =
        location.pathname === "/map" ||
        location.pathname === "/submit/location";
    const isAccountPage = location.pathname === "/account";

    if (isMapInterface) {
        return null;
    }

    return (
        <>
            <footer
                className={[
                    "site-footer",
                    isAccountPage ? "site-footer--account" : "",
                ].filter(Boolean).join(" ")}
            >
                <div className="site-footer__inner">
                    <div className="site-footer__product">
                        <strong>Native Places</strong>
                        <span>версия {SITE_VERSION}</span>
                    </div>

                    <nav className="site-footer__links" aria-label="Сведения о платформе">
                        <button
                            type="button"
                            onClick={() => setActiveDialog("documents")}
                        >
                            Документы
                        </button>
                        <span aria-hidden="true">·</span>
                        <button
                            type="button"
                            onClick={() => setActiveDialog("about")}
                        >
                            О платформе
                        </button>
                    </nav>

                    <a
                        className="site-footer__studio"
                        href={STUDIO_URL}
                        target="_blank"
                        rel="noreferrer"
                    >
                        VKazakDon Studio © 2026
                    </a>
                </div>
            </footer>

            {activeDialog === "documents" ? (
                <DocumentsDialog onClose={() => setActiveDialog(null)} />
            ) : null}

            {activeDialog === "about" ? (
                <AboutDialog onClose={() => setActiveDialog(null)} />
            ) : null}
        </>
    );
}
