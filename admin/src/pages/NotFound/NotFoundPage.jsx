import { useNavigate } from "react-router-dom";

import "./NotFoundPage.css";

export function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <section className="page not-found-page">
            <div className="not-found-card">
                <div className="not-found-code">
                    404
                </div>

                <h1>Раздел не найден</h1>

                <p>
                    Возможно ссылка устарела, раздел был удалён
                    или у вас недостаточно прав доступа.
                </p>

                <div className="not-found-actions">
                    <button
                        type="button"
                        className="button button--primary"
                        onClick={() => navigate("/")}
                    >
                        На главную
                    </button>

                    <button
                        type="button"
                        className="button"
                        onClick={() => navigate(-1)}
                    >
                        Назад
                    </button>
                </div>
            </div>
        </section>
    );
}