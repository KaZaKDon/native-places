import { Link, useNavigate } from "react-router-dom";

import "./NotFoundPage.css";

export function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <section className="not-found-page">
            <div className="not-found-page__overlay" />

            <div className="not-found-page__content">
                <p className="not-found-page__eyebrow">Ошибка 404</p>

                <h1>Вы свернули не на ту тропинку</h1>

                <p className="not-found-page__text">
                    Страница не найдена. Возможно, адрес был изменён,
                    удалён или введён с ошибкой.
                </p>

                <div className="not-found-page__actions">
                    <Link
                        className="not-found-page__button not-found-page__button--primary"
                        to="/"
                    >
                        На главную
                    </Link>

                    <button
                        className="not-found-page__button"
                        type="button"
                        onClick={() => navigate(-1)}
                    >
                        Назад
                    </button>
                </div>
            </div>
        </section>
    );
}