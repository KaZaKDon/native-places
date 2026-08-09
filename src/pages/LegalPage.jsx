import { Link, useLocation } from "react-router-dom";

import { Seo } from "../shared/seo/Seo";

import "./LegalPage.css";

const LEGAL_PAGES = {
    rules: {
        eyebrow: "Правила Native Places",
        title: "Правила сайта",
        path: "/rules",
        seoTitle: "Правила сайта | Native Places",
        seoDescription: "Правила размещения объявлений, общения и модерации на Native Places для безопасного каталога мест, маршрутов и объектов у природы.",
        intro: "Эти правила помогают сохранять каталог полезным, безопасным и удобным для путешественников, владельцев объектов и модераторов.",
        sections: [
            {
                title: "Публикуйте достоверную информацию",
                text: "Размещайте только реальные места, объявления и контакты. Не добавляйте заведомо ложные цены, адреса, фотографии или условия размещения.",
            },
            {
                title: "Уважайте других пользователей",
                text: "Не допускаются оскорбления, спам, мошеннические предложения, дискриминация и любые действия, которые мешают пользоваться сервисом.",
            },
            {
                title: "Модерация",
                text: "Администрация может проверять, скрывать, отклонять или архивировать материалы, если они нарушают правила сайта или требуют уточнения.",
            },
        ],
    },
    privacy: {
        eyebrow: "Конфиденциальность",
        title: "Политика конфиденциальности",
        path: "/privacy-policy",
        seoTitle: "Политика конфиденциальности | Native Places",
        seoDescription: "Политика конфиденциальности Native Places: какие данные используются для аккаунта, публикации объявлений, модерации и безопасности сервиса.",
        intro: "Мы собираем только те данные, которые нужны для работы аккаунта, публикации объявлений, связи с пользователями и безопасности сервиса.",
        sections: [
            {
                title: "Какие данные используются",
                text: "Это может быть email, имя, телефон, Telegram, данные профиля, сведения об объявлениях и техническая информация о действиях в сервисе.",
            },
            {
                title: "Зачем нужны данные",
                text: "Данные используются для регистрации, входа, восстановления доступа, публикации объектов, модерации, обратной связи и улучшения работы сайта.",
            },
            {
                title: "Безопасность",
                text: "Мы не публикуем личные данные без необходимости и ограничиваем доступ к административным разделам ролями и авторизацией.",
            },
        ],
    },
    agreement: {
        eyebrow: "Пользовательское соглашение",
        title: "Пользовательское соглашение",
        path: "/user-agreement",
        seoTitle: "Пользовательское соглашение | Native Places",
        seoDescription: "Пользовательское соглашение Native Places: условия использования сервиса, ответственность пользователей и правила размещения материалов.",
        intro: "Используя Native Places, пользователь соглашается соблюдать правила сайта и несёт ответственность за размещаемую информацию.",
        sections: [
            {
                title: "Аккаунт",
                text: "Пользователь отвечает за безопасность своего аккаунта, корректность email и сохранность пароля.",
            },
            {
                title: "Контент пользователя",
                text: "Публикуя объявления, отзывы, обращения и другие материалы, пользователь подтверждает, что имеет право размещать эти данные.",
            },
            {
                title: "Изменение условий",
                text: "Администрация может обновлять условия работы сервиса. Актуальная версия документов размещается на этих страницах.",
            },
        ],
    },
};

const LEGAL_LINKS = [
    { slug: "rules", label: "Правила сайта", path: "/rules" },
    { slug: "privacy", label: "Политика конфиденциальности", path: "/privacy-policy" },
    { slug: "agreement", label: "Пользовательское соглашение", path: "/user-agreement" },
];

function getBackPath(state) {
    return state?.from || "/auth";
}

export function LegalPage({ type }) {
    const location = useLocation();
    const page = LEGAL_PAGES[type] || LEGAL_PAGES.rules;
    const backPath = getBackPath(location.state);

    return (
        <>
            <Seo
                title={page.seoTitle}
                description={page.seoDescription}
                canonical={`https://native-places.ru${page.path}`}
            />
        <main className="legal-page">
            <section className="legal-card">
                <nav className="legal-card__nav" aria-label="Юридические документы">
                    {LEGAL_LINKS.map((item) => (
                        <Link
                            key={item.slug}
                            className={
                                item.slug === type
                                    ? "legal-card__nav-link legal-card__nav-link--active"
                                    : "legal-card__nav-link"
                            }
                            to={item.path}
                            state={{ from: backPath }}
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <p className="legal-card__eyebrow">{page.eyebrow}</p>
                <h1 className="legal-card__title">{page.title}</h1>
                <p className="legal-card__intro">{page.intro}</p>

                <div className="legal-card__content">
                    {page.sections.map((section) => (
                        <section key={section.title} className="legal-card__section">
                            <h2>{section.title}</h2>
                            <p>{section.text}</p>
                        </section>
                    ))}
                </div>

                <div className="legal-card__notice">
                    <strong>Черновая версия.</strong> Текст подготовлен как минимальная информация для запуска интерфейса.
                    Перед публичным использованием его стоит согласовать и дополнить юридически точными формулировками.
                </div>

                <div className="legal-card__actions">
                    <Link className="legal-card__button legal-card__button--primary" to={backPath}>
                        Вернуться назад
                    </Link>
                    <Link className="legal-card__button" to="/">
                        На главную
                    </Link>
                </div>
            </section>
        </main>
        </>
    );
}